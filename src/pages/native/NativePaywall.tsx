import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Loader2, RefreshCw, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useNativeStartup } from '@/contexts/NativeStartupContext';
import { TRIAL } from '@/config/pricing';
import { NATIVE_OFFER_CARDS } from '@/config/nativeOffers';
import {
  type NativePlanChoice,
  readNativePlanIntent,
  clearNativePlanIntent,
} from '@/lib/native/nativeStartup';
import { savePlanSelection, type PlanSelection } from '@/lib/native/planStatus';
import { activateFreeTrial } from '@/lib/native/trial';
import {
  PLAN_BY_CHOICE,
  getStorePrices,
  getSubscriptionManagementUrl,
  initNativeBilling,
  isNativeBillingAvailable,
  restoreNativePurchases,
  startNativePurchase,
  type StorePriceInfo,
} from '@/lib/native/billing';
import type { StorePlanKey } from '@/config/revenuecat';

/** Paywall card → Supabase `profiles.plan_selection` value (UI intent only). */
const SELECTION_BY_CHOICE: Record<Exclude<NativePlanChoice, 'free'>, PlanSelection> = {
  premium: 'starter',
  premium_plus: 'premium',
};

/**
 * Native-only paywall (Capacitor). All purchases go through
 * `src/lib/native/billing.ts` → RevenueCat → Google Play / App Store.
 * Stripe is never used here; the free 7-day trial stays on Supabase.
 */
export default function NativePaywall() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refresh } = useNativeStartup();
  const [pending, setPending] = useState<NativePlanChoice | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [intent, setIntent] = useState<NativePlanChoice | null>(null);
  const [prices, setPrices] = useState<Partial<Record<StorePlanKey, StorePriceInfo>>>({});
  const [loadingPrices, setLoadingPrices] = useState(isNativeBillingAvailable());
  const [manageUrl, setManageUrl] = useState<string | null>(null);

  useEffect(() => {
    readNativePlanIntent().then(setIntent);
  }, []);

  const loadPrices = useCallback(async () => {
    if (!user || !isNativeBillingAvailable()) {
      setLoadingPrices(false);
      return;
    }
    setLoadingPrices(true);
    await initNativeBilling(user.id);
    const [storePrices, url] = await Promise.all([
      getStorePrices(),
      getSubscriptionManagementUrl(user.id),
    ]);
    setPrices(storePrices);
    setManageUrl(url);
    setLoadingPrices(false);
  }, [user]);

  useEffect(() => {
    void loadPrices();
  }, [loadPrices]);

  const choose = async (choice: NativePlanChoice) => {
    if (!user || pending || restoring) return;
    setPending(choice);
    void clearNativePlanIntent();
    setIntent(null);
    try {
      // Free offer: existing NutriZen server logic (grant_welcome_credits),
      // idempotent — a double tap never creates two trials.
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

      const result = await startNativePurchase(choice, user.id);
      if (result.status === 'purchased') {
        // UI intent only — the entitlement itself comes from the store sync.
        await savePlanSelection(user.id, SELECTION_BY_CHOICE[choice]);
        refresh();
        toast.success('Merci ! Votre abonnement est actif.');
        navigate('/app/dashboard', { replace: true });
      } else if (result.status === 'pending') {
        refresh();
        toast.info(result.message);
      } else if (result.status === 'cancelled') {
        toast.info('Achat annulé.');
      } else if (result.status === 'unavailable' || result.status === 'error') {
        toast.error(result.message);
      }
    } finally {
      setPending(null);
    }
  };

  const restore = async () => {
    if (!user || restoring || pending) return;
    setRestoring(true);
    try {
      const result = await restoreNativePurchases(user.id);
      if (result.status === 'restored') {
        refresh();
        toast.success('Vos achats ont été restaurés.');
        navigate('/app/dashboard', { replace: true });
      } else if (result.status === 'nothing') {
        toast.info('Aucun abonnement à restaurer sur ce compte.');
      } else {
        toast.error(result.message || 'Restauration impossible.');
      }
    } finally {
      setRestoring(false);
    }
  };

  const priceLabel = (choice: NativePlanChoice, fallback: string) => {
    if (choice === 'free') return fallback;
    const plan = PLAN_BY_CHOICE[choice as Exclude<NativePlanChoice, 'free'>];
    const store = prices[plan];
    if (store) return `${store.priceString} / mois`;
    if (loadingPrices) return '…';
    return fallback;
  };

  const busy = pending !== null || restoring;

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto w-full max-w-md space-y-6">
        <header className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Choisissez votre formule</h1>
          <p className="text-sm text-muted-foreground">
            Vous pouvez commencer gratuitement et changer à tout moment.
          </p>
        </header>

        {intent && intent !== 'free' && (
          <p className="rounded-xl bg-accent/10 p-3 text-center text-xs text-foreground">
            Formule choisie avant votre inscription :{' '}
            <strong>{intent === 'premium' ? 'Premium' : 'Premium+'}</strong>
          </p>
        )}

        {loadingPrices && (
          <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Chargement des tarifs…
          </p>
        )}

        <div className="space-y-4">
          {NATIVE_OFFER_CARDS.map((card) => (
            <Card
              key={card.choice}
              className={`p-5 ${card.highlight ? 'border-primary border-2' : ''}`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="text-lg font-semibold text-card-foreground">{card.title}</h2>
                <span className="text-base font-bold text-primary whitespace-nowrap">
                  {priceLabel(card.choice, card.priceLabel)}
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
                disabled={busy}
                onClick={() => choose(card.choice)}
              >
                {pending === card.choice && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {pending === card.choice && card.choice !== 'free'
                  ? 'Achat en cours…'
                  : card.choice === 'free'
                    ? 'Continuer gratuitement'
                    : `Choisir ${card.title}`}
              </Button>
            </Card>
          ))}
        </div>

        <Button variant="ghost" className="w-full h-11" disabled={busy} onClick={restore}>
          {restoring ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Restaurer mes achats
        </Button>

        {manageUrl && (
          <a
            href={manageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground underline"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Gérer mon abonnement
          </a>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Les abonnements sont facturés par Google Play (ou l'App Store) et résiliables à tout
          moment depuis votre compte store.
        </p>
      </div>
    </div>
  );
}
