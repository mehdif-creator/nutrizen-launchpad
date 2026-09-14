/**
 * RevenueCat configuration (native only — never used on the web).
 *
 * The SDK keys below are **public** RevenueCat SDK keys (safe in client code).
 * The secret key (sk_...) is NEVER in the app: it only lives in the
 * `revenuecat-sync` / `revenuecat-webhook` edge functions.
 *
 * Prices and currencies always come from the Store (Google Play / App Store)
 * through RevenueCat offerings — never hardcoded here.
 */

/** Public SDK keys per platform. Set them from the RevenueCat dashboard → API keys. */
export const REVENUECAT_API_KEYS = {
  android: import.meta.env.VITE_REVENUECAT_ANDROID_KEY ?? '',
  ios: import.meta.env.VITE_REVENUECAT_IOS_KEY ?? '',
} as const;

/** RevenueCat offering that contains the two NutriZen subscriptions. */
export const REVENUECAT_OFFERING_ID = 'default';

/** RevenueCat entitlement identifiers (must match the dashboard exactly). */
export const RC_ENTITLEMENTS = {
  starter: 'starter',
  premium: 'premium',
} as const;

/** Store product identifiers (Google Play subscription / base plan product ids). */
export const STORE_PRODUCT_IDS = {
  starter: 'nutrizen_starter_monthly',
  premium: 'nutrizen_premium_monthly',
} as const;

export type StorePlanKey = keyof typeof STORE_PRODUCT_IDS;
