import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useNativeStartup } from '@/contexts/NativeStartupContext';
import { TRIAL } from '@/config/pricing';
import { NATIVE_OFFER_CARDS } from '@/config/nativeOffers';
import { type NativePlanChoice } from '@/lib/native/nativeStartup';
import { savePlanSelection, type PlanSelection } from '@/lib/native/planStatus';
import { activateFreeTrial } from '@/lib/native/trial';
import { startNativePurchase } from '@/lib/native/billing';


/** Paywall card → Supabase `profiles.plan_selection` value. */
const SELECTION_BY_CHOICE: Record<Exclude<NativePlanChoice, 'free'>, PlanSelection> = {
  premium: 'starter',
  premium_plus: 'premium',
};

/**
 * Native-only paywall (Capacitor). Shown once after onboarding.
 * The purchase layer lives in `src/lib/native/billing.ts` so that Google Play
 * Billing / StoreKit can be connected later without changing this screen.
 */
export default function NativePaywall() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refresh } = useNativeStartup();
  const [pending, setPending] = useState<NativePlanChoice | null>(null);

  const choose = async (choice: NativePlanChoice) => {
    if (!user || pending) return;
    setPending(choice);
    try {
      // Free offer: activated by the existing NutriZen server logic
      // (grant_welcome_credits → 11 crédits + subscription trialing 7 jours).
      // The RPC is idempotent, so a double click never creates two trials.
      if (choice === 'free') {
        const result = await activateFreeTrial(user.id);
        if (!result.ok) {
          toast.error(result.message || "Impossible d'activer l'essai gratuit. Réessayez.");
          return;
        }
        refresh();
        toast.success(
          result.alreadyActive
            ? 'Votre essai est actif. Bon appétit !'
            : `Essai de ${TRIAL.days} jours activé · ${TRIAL.credits} crédits offerts`
        );
        navigate('/app/dashboard', { replace: true });
        return;
      }

      const result = await startNativePurchase(choice);
      if (result.status === 'purchased') {
        await savePlanSelection(user.id, SELECTION_BY_CHOICE[choice]);
        refresh();
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
          {NATIVE_OFFER_CARDS.map((card) => (
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
