import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Copy, Check, Gift, TrendingUp, MousePointerClick } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { DashboardReferral } from '@/hooks/useUserDashboard';
import { Link } from 'react-router-dom';

interface ReferralCardProps {
  referral: DashboardReferral | null;
  isLoading: boolean;
  userId?: string;
  onRefresh?: () => void;
}

export function ReferralCard({ referral, isLoading, userId, onRefresh }: ReferralCardProps) {
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  const handleCopy = async () => {
    if (!referral?.code) return;
    
    const url = `${window.location.origin}?ref=${referral.code}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Lien copié !');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Erreur lors de la copie');
    }
  };

  const handleGenerateCode = async () => {
    if (!userId) return;
    
    setGenerating(true);
    try {
      const { error } = await supabase.rpc('generate_user_referral_code', {
        p_user_id: userId,
      });

      if (error) throw error;

      toast.success('Code de parrainage créé !');
      onRefresh?.();
    } catch (error) {
      console.error('Error generating referral code:', error);
      toast.error('Impossible de générer le code');
    } finally {
      setGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="rounded-2xl border shadow-sm p-4 md:p-5">
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="text-sm md:text-base font-semibold">Parrainage</h3>
        </div>
        <Skeleton className="h-10 w-full mb-3" />
        <div className="grid grid-cols-3 gap-2">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      </Card>
    );
  }

  // No code yet - show activation
  if (!referral?.has_code) {
    return (
      <Card className="rounded-2xl border shadow-sm p-4 md:p-5">
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="text-sm md:text-base font-semibold">Parrainage</h3>
        </div>
        <div className="py-4 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            Générez votre code de parrainage pour inviter vos amis.
          </p>
          <Button onClick={handleGenerateCode} disabled={generating}>
            {generating ? 'Génération...' : 'Activer le parrainage'}
          </Button>
        </div>
      </Card>
    );
  }

  const referralUrl = `${window.location.origin}?ref=${referral.code}`;

  return (
    <Card className="rounded-2xl border shadow-sm p-4 md:p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="text-sm md:text-base font-semibold">Parrainage</h3>
        </div>
        <Link to="/app/referral">
          <Button variant="ghost" size="sm" className="text-xs">
            Voir plus
          </Button>
        </Link>
      </div>

      {/* Referral link */}
      <div className="space-y-2 mb-4">
        <label className="text-xs text-muted-foreground">Votre lien :</label>
        <div className="flex gap-2">
          <Input
            value={referralUrl}
            readOnly
            className="font-mono text-xs h-9"
          />
          <Button
            onClick={handleCopy}
            size="sm"
            variant="outline"
            className="flex-shrink-0 h-9"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center p-2 bg-muted/50 rounded-lg">
          <MousePointerClick className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
          <div className="text-lg font-semibold">{referral.clicks}</div>
          <div className="text-xs text-muted-foreground">Clics</div>
        </div>
        <div className="text-center p-2 bg-muted/50 rounded-lg">
          <TrendingUp className="h-4 w-4 mx-auto mb-1 text-blue-500" />
          <div className="text-lg font-semibold">{referral.signups}</div>
          <div className="text-xs text-muted-foreground">Inscriptions</div>
        </div>
        <div className="text-center p-2 bg-muted/50 rounded-lg">
          <Gift className="h-4 w-4 mx-auto mb-1 text-green-500" />
          <div className="text-lg font-semibold">{referral.qualified}</div>
          <div className="text-xs text-muted-foreground">Qualifiés</div>
        </div>
      </div>

      {/* Explanation */}
      <p className="text-xs text-muted-foreground mt-3">
        Un filleul est qualifié après son premier achat de crédits. Vous gagnez +10 crédits par filleul qualifié !
      </p>
    </Card>
  );
}
