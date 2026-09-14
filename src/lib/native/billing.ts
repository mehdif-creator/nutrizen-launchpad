/**
 * Native purchase layer — deliberately separated from the paywall UI so that
 * Google Play Billing (Android) and StoreKit (iOS) can be plugged in later
 * without touching the paywall screen. Stripe is NOT used inside the native app.
 */
import type { NativePlanChoice } from '@/lib/native/nativeStartup';

export type NativePurchaseResult =
  | { status: 'purchased'; productId: string }
  | { status: 'cancelled' }
  | { status: 'unavailable'; message: string };

/** Store product identifiers, to be created in Play Console / App Store Connect. */
export const NATIVE_PRODUCT_IDS: Record<Exclude<NativePlanChoice, 'free'>, string> = {
  premium: 'nutrizen_premium_monthly',
  premium_plus: 'nutrizen_premium_plus_monthly',
};

/**
 * Starts a native store purchase.
 * Placeholder implementation: returns `unavailable` until the billing plugin
 * is wired in. The paywall UI only reads the returned status.
 */
export async function startNativePurchase(
  plan: Exclude<NativePlanChoice, 'free'>
): Promise<NativePurchaseResult> {
  return {
    status: 'unavailable',
    message:
      "Les abonnements dans l'application arrivent très bientôt. En attendant, vous pouvez continuer avec l'offre gratuite.",
  };
}
