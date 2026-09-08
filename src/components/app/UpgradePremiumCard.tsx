import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Check, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { callEdgeFunction } from '@/lib/edgeFn';
import { PLANS, getTotalPrice, formatEUR, type PlanTier } from '@/config/pricing';

interface UpgradePremiumCardProps {
  className?: string;
  compact?: boolean;
}

export function UpgradePremiumCard({ className = '', compact = false }: UpgradePremiumCardProps) {
  const { subscription } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState<PlanTier | null>(null);

  const hasActivePlan = subscription?.status === 'active';
  if (hasActivePlan) return null;

  const startCheckout = async (tier: PlanTier) => {
    setLoading(tier);
    try {
      const data = await callEdgeFunction<{ url?: string }>('create-app-checkout', {
        mode: 'subscription',
        plan: tier,
      });
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Lien de paiement indisponible');
      }
    } catch (err) {
      toast({
        title: 'Erreur',
        description:
          err instanceof Error ? err.message : "Impossible d'ouvrir la page de paiement.",
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <Card className={`p-5 md:p-6 bg-gradient-to-br from-primary/10 to-accent/10 ${className}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            Passez à l'abonnement
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Menus illimités, crédits mensuels renouvelés et toutes les fonctionnalités IA.
          </p>
        </div>
        <Badge variant="secondary" className="shrink-0">
          Sans engagement
        </Badge>
      </div>

      <div className={`grid gap-3 ${compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
        {(['starter', 'premium'] as PlanTier[]).map((tier) => {
          const plan = PLANS[tier];
          const isPremium = tier === 'premium';
          return (
            <div
              key={tier}
              className={`rounded-xl border bg-card p-4 flex flex-col ${
                isPremium ? 'border-primary ring-1 ring-primary/30' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold">{plan.name}</span>
                {isPremium && <Badge className="bg-primary text-primary-foreground">Populaire</Badge>}
              </div>
              <p className="text-2xl font-bold">
                {formatEUR(getTotalPrice(tier, 'month'))}
                <span className="text-sm font-normal text-muted-foreground"> /mois</span>
              </p>
              <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground flex-1">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary shrink-0" />
                  {plan.credits} crédits par mois
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary shrink-0" />
                  Menus de la semaine illimités
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary shrink-0" />
                  {isPremium ? 'Support prioritaire' : 'Liste de courses automatique'}
                </li>
              </ul>
              <Button
                className="w-full mt-4"
                variant={isPremium ? 'default' : 'outline'}
                disabled={loading !== null}
                onClick={() => startCheckout(tier)}
              >
                {loading === tier ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Redirection…
                  </>
                ) : (
                  `Choisir ${plan.name}`
                )}
              </Button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
