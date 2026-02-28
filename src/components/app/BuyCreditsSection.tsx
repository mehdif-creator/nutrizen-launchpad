import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Zap, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState } from 'react';
import { createLogger } from '@/lib/logger';

const logger = createLogger('BuyCredits');

const PACKS = [
  {
    id: 'topup_30',
    credits: 30,
    price: '9,99 €',
    icon: Zap,
    color: 'from-blue-500/10 to-blue-600/5',
    border: 'border-blue-500/20',
    badge: null,
    perCredit: '0,33 €/crédit',
  },
  {
    id: 'topup_80',
    credits: 80,
    price: '19,99 €',
    icon: Sparkles,
    color: 'from-primary/10 to-primary/5',
    border: 'border-primary/30',
    badge: 'Populaire',
    perCredit: '0,25 €/crédit',
  },
  {
    id: 'topup_200',
    credits: 200,
    price: '39,99 €',
    icon: Star,
    color: 'from-amber-500/10 to-amber-600/5',
    border: 'border-amber-500/20',
    badge: 'Meilleur prix',
    perCredit: '0,20 €/crédit',
  },
];

export function BuyCreditsSection() {
  const [loadingPack, setLoadingPack] = useState<string | null>(null);

  const handleBuy = async (packId: string) => {
    setLoadingPack(packId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.info('Connecte-toi pour acheter des crédits');
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-credits-checkout', {
        body: { pack_id: packId },
      });

      if (error) {
        logger.error('Checkout error', error instanceof Error ? error : new Error(String(error)));
        toast.error('Erreur lors de la création du paiement. Réessaie.');
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      } else {
        toast.error('URL de paiement non reçue. Réessaie.');
      }
    } catch (err) {
      logger.error('Unexpected error', err instanceof Error ? err : new Error(String(err)));
      toast.error('Erreur réseau. Vérifie ta connexion.');
    } finally {
      setLoadingPack(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Sparkles className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Acheter des Crédits Zen</h2>
      </div>

      <p className="text-muted-foreground text-sm">
        Les crédits n'expirent jamais. Utilisables sur swap, InspiFrigo et ScanRepas.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PACKS.map((pack) => {
          const Icon = pack.icon;
          const isLoading = loadingPack === pack.id;
          return (
            <Card
              key={pack.id}
              className={`relative p-6 bg-gradient-to-br ${pack.color} ${pack.border} flex flex-col items-center text-center gap-4`}
            >
              {pack.badge && (
                <Badge className="absolute -top-2.5 right-3 bg-primary text-primary-foreground text-xs">
                  {pack.badge}
                </Badge>
              )}

              <div className="p-3 rounded-full bg-background/80">
                <Icon className="h-6 w-6 text-primary" />
              </div>

              <div>
                <p className="text-3xl font-bold">{pack.credits}</p>
                <p className="text-sm text-muted-foreground">crédits</p>
              </div>

              <div>
                <p className="text-xl font-semibold">{pack.price}</p>
                <p className="text-xs text-muted-foreground">{pack.perCredit}</p>
              </div>

              <Button
                className="w-full"
                onClick={() => handleBuy(pack.id)}
                disabled={loadingPack !== null}
              >
                {isLoading ? 'Chargement...' : 'Acheter'}
              </Button>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        💡 Tes crédits achetés sont utilisés en dernier, après tes crédits d'abonnement mensuels.
      </p>
    </div>
  );
}
