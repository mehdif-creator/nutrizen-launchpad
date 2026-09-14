/**
 * Native purchase layer — deliberately separated from the paywall UI so that
 * Google Play Billing (Android) and StoreKit (iOS) can be plugged in later
 * without touching the paywall screen. Stripe is NOT used inside the native app.
 *
 * Store product mapping (to create in Play Console / App Store Connect):
 *   Starter  (12,99 €/mois, 80 crédits)  → nutrizen_starter_monthly
 *   Premium  (19,99 €/mois, 200 crédits) → nutrizen_premium_monthly
 */
import type { NativePlanChoice } from '@/lib/native/nativeStartup';

export type NativePaidChoice = Exclude<NativePlanChoice, 'free'>;

export type NativePurchaseResult =
  | { status: 'purchased'; productId: string }
  | { status: 'cancelled' }
  | { status: 'unavailable'; message: string };

/** Paywall card → store product id. `premium` = Starter offer, `premium_plus` = Premium offer. */
export const NATIVE_PRODUCT_IDS: Record<NativePaidChoice, string> = {
  premium: 'nutrizen_starter_monthly',
  premium_plus: 'nutrizen_premium_monthly',
};

/**
 * Starts a native store purchase.
 * Placeholder implementation: returns `unavailable` until Google Play Billing /
 * StoreKit is wired in. Stripe is intentionally never called from the app.
 */
export async function startNativePurchase(plan: NativePaidChoice): Promise<NativePurchaseResult> {
  void NATIVE_PRODUCT_IDS[plan];
  return {
    status: 'unavailable',
    message:
      "Les abonnements dans l'application arrivent très bientôt. En attendant, vous pouvez commencer avec l'essai gratuit.",
  };
}
