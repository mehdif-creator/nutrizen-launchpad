import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Share2, Check, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { callEdgeFunction } from '@/lib/edgeFn';

interface ShareWeekCardProps {
  weekStart: string | undefined;
  hasMenu: boolean;
}

export function ShareWeekCard({ weekStart, hasMenu }: ShareWeekCardProps) {
  const { toast } = useToast();
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    if (!weekStart || !hasMenu) {
      toast({
        title: 'Aucun menu',
        description: 'Génère d\'abord ton menu pour le partager.',
        variant: 'destructive',
      });
      return;
    }

    setSharing(true);
    try {
      const data = await callEdgeFunction<{
        success: boolean;
        token: string;
        error?: string;
      }>('create-share-link', { week_start: weekStart });

      if (!data.success || !data.token) {
        throw new Error(data.error || 'Impossible de créer le lien.');
      }

      const shareUrl = `${window.location.origin}/share/week/${data.token}`;

      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);

      toast({
        title: 'Lien copié ! 🎉',
        description: 'Partage-le avec tes amis pour les inspirer.',
      });
    } catch (err: any) {
      toast({
        title: 'Erreur',
        description: err.message || 'Impossible de générer le lien de partage.',
        variant: 'destructive',
      });
    } finally {
      setSharing(false);
    }
  };

  return (
    <Card className="rounded-2xl border shadow-sm bg-primary text-primary-foreground p-4 md:p-5">
      <div className="text-sm md:text-base font-semibold mb-1">Partage ta semaine Zen</div>
      <div className="text-primary-foreground/90 text-xs md:text-sm mb-3">
        Montre tes menus planifiés en 3 minutes — inspire un ami et gagne +5 crédits.
      </div>
      <Button
        variant="secondary"
        className="w-full text-xs md:text-sm"
        onClick={handleShare}
        disabled={sharing || !hasMenu}
      >
        {sharing ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Création du lien...
          </>
        ) : copied ? (
          <>
            <Check className="h-4 w-4 mr-2" />
            Lien copié !
          </>
        ) : (
          <>
            <Share2 className="h-4 w-4 mr-2" />
            Partager un aperçu
          </>
        )}
      </Button>
    </Card>
  );
}
