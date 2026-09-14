import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { PLANS, TRIAL, formatEUR } from '@/config/pricing';
import { setNativePlanChoice, type NativePlanChoice } from '@/lib/native/nativeStartup';
import { startNativePurchase } from '@/lib/native/billing';

interface PaywallCard {
  choice: NativePlanChoice;
  title: string;
  priceLabel: string;
  subtitle: string;
  features: string[];
  highlight?: boolean;
}

/** Cards are derived from the existing NutriZen offers (src/config/pricing.ts). */
const CARDS: PaywallCard[] = [
  {
    choice: 'free',
    title: 'Free',
    priceLabel: 'Gratuit',
    subtitle: `${TRIAL.days} jours pour tester · ${TRIAL.credits} crédits offerts`,
    features: [
      `${TRIAL.credits} crédits offerts`,
      'Sans carte bancaire',
      'Accès aux recettes et à la liste de courses',
    ],
  },
  {
    choice: 'premium',
    title: 'Premium',
    priceLabel: `${formatEUR(PLANS.starter.monthlyPrice)} / mois`,
    subtitle: PLANS.starter.tagline,
    features: [
      `${PLANS.starter.credits} crédits par mois`,
      `Report jusqu'à ${PLANS.starter.rolloverCap} crédits`,
      'Menus illimités pour votre famille',
    ],
    highlight: true,
  },
  {
    choice: 'premium_plus',
    title: 'Premium+',
    priceLabel: `${formatEUR(PLANS.premium.monthlyPrice)} / mois`,
    subtitle: PLANS.premium.tagline,
    features: [
      `${PLANS.premium.credits} crédits par mois`,
      `Report jusqu'à ${PLANS.premium.rolloverCap} crédits`,
      'Tous les outils IA (Scan repas, Inspi Frigo, code-barres)',
    ],
  },
];

/**
 * Native-only paywall (Capacitor). Shown once after onboarding.
 * The purchase layer lives in `src/lib/native/billing.ts` so that Google Play
 * Billing / StoreKit can be connected later without changing this screen.
 */
export default function NativePaywall() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pending, setPending] = useState<NativePlanChoice | null>(null);

  const choose = async (choice: NativePlanChoice) => {
    if (!user || pending) return;
    setPending(choice);
    try {
      if (choice === 'free') {
        await setNativePlanChoice(user.id, 'free');
        navigate('/app/dashboard', { replace: true });
        return;
      }

      const result = await startNativePurchase(choice);
      if (result.status === 'purchased') {
        await setNativePlanChoice(user.id, choice);
        toast.success('Merci ! Votre abonnement est actif.');
        navigate('/app/dashboard', { replace: true });
      } else if (result.status === 'unavailable') {
        toast.info(result.message);
      }
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto w-full max-w-md space-y-6">
        <header className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Choisissez votre formule</h1>
          <p className="text-sm text-muted-foreground">
            Vous pouvez commencer gratuitement et changer à tout moment.
          </p>
        </header>

        <div className="space-y-4">
          {CARDS.map((card) => (
            <Card
              key={card.choice}
              className={`p-5 ${card.highlight ? 'border-primary border-2' : ''}`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="text-lg font-semibold text-card-foreground">{card.title}</h2>
                <span className="text-base font-bold text-primary whitespace-nowrap">
                  {card.priceLabel}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{card.subtitle}</p>

              <ul className="mt-4 space-y-2">
                {card.features.map((f) => (
                  <li key={f} className="flex gap-2 text-sm text-card-foreground">
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <Button
                className="mt-5 w-full h-12 text-base"
                variant={card.highlight ? 'default' : 'outline'}
                disabled={pending !== null}
                onClick={() => choose(card.choice)}
              >
                {pending === card.choice && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {card.choice === 'free' ? 'Continuer gratuitement' : `Choisir ${card.title}`}
              </Button>
            </Card>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Les paiements dans l'application passeront par Google Play et l'App Store.
        </p>
      </div>
    </div>
  );
}
