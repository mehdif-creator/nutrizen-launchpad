/**
 * Native purchase layer — the ONLY interface used by the native paywall.
 *
 * Chain: NativePaywall → billing.ts → RevenueCat (@revenuecat/purchases-capacitor)
 *        → Google Play Billing / StoreKit → RevenueCat entitlement
 *        → Supabase sync (`revenuecat-sync` edge function) → NativeStartupContext refresh.
 *
 * Rules:
 * - Stripe is NEVER called from the native app (web checkout stays untouched).
 * - Prices/currencies always come from the Store via RevenueCat offerings.
 * - The real entitlement comes from RevenueCat/Store, never from
 *   `profiles.plan_selection` (which is UI intent only).
 * - The RevenueCat appUserID is always the Supabase `user.id`.
 */
import { Purchases, LOG_LEVEL, PURCHASES_ERROR_CODE } from '@revenuecat/purchases-capacitor';
import type { CustomerInfo, PurchasesPackage } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { isNativePlatform } from '@/lib/platform';
import { createLogger } from '@/lib/logger';
import {
  RC_ENTITLEMENTS,
  REVENUECAT_API_KEYS,
  REVENUECAT_OFFERING_ID,
  STORE_PRODUCT_IDS,
  type StorePlanKey,
} from '@/config/revenuecat';
import { clearPlanStatusCache } from '@/lib/native/planStatus';
import type { NativePlanChoice } from '@/lib/native/nativeStartup';

const logger = createLogger('NativeBilling');

/** Paywall card → store plan. `premium` card = Starter offer, `premium_plus` = Premium offer. */
export type NativePaidChoice = Exclude<NativePlanChoice, 'free'>;

export const PLAN_BY_CHOICE: Record<NativePaidChoice, StorePlanKey> = {
  premium: 'starter',
  premium_plus: 'premium',
};

/** Kept for backwards compatibility with earlier code/tests. */
export const NATIVE_PRODUCT_IDS: Record<NativePaidChoice, string> = {
  premium: STORE_PRODUCT_IDS.starter,
  premium_plus: STORE_PRODUCT_IDS.premium,
};

export interface StorePriceInfo {
  /** Localized price string returned by the Store, e.g. "12,99 €". */
  priceString: string;
  price: number;
  currencyCode: string;
  productId: string;
}

export type NativePurchaseResult =
  | { status: 'purchased'; productId: string; entitlement: StorePlanKey }
  | { status: 'pending'; message: string }
  | { status: 'cancelled' }
  | { status: 'unavailable'; message: string }
  | { status: 'error'; message: string };

export interface RestoreResult {
  status: 'restored' | 'nothing' | 'unavailable' | 'error';
  entitlement?: StorePlanKey;
  message?: string;
}

function apiKey(): string {
  const platform = Capacitor.getPlatform();
  if (platform === 'ios') return REVENUECAT_API_KEYS.ios;
  return REVENUECAT_API_KEYS.android;
}

/** True when the store billing layer can actually be used on this device. */
export function isNativeBillingAvailable(): boolean {
  return isNativePlatform() && apiKey().length > 0;
}

let configuredUserId: string | null = null;

/**
 * Configures RevenueCat once and links the RevenueCat appUserID to the
 * Supabase user id (so purchases follow the account across devices).
 */
export async function initNativeBilling(userId: string): Promise<boolean> {
  if (!isNativeBillingAvailable()) return false;
  try {
    const { isConfigured } = await Purchases.isConfigured();
    if (!isConfigured) {
      await Purchases.setLogLevel({ level: LOG_LEVEL.ERROR });
      await Purchases.configure({ apiKey: apiKey(), appUserID: userId });
      configuredUserId = userId;
      return true;
    }
    if (configuredUserId !== userId) {
      await Purchases.logIn({ appUserID: userId });
      configuredUserId = userId;
    }
    return true;
  } catch (error) {
    logger.error(
      'RevenueCat configure failed',
      error instanceof Error ? error : new Error(String(error))
    );
    return false;
  }
}

/** Store prices for Starter and Premium, straight from Google Play / App Store. */
export async function getStorePrices(): Promise<Partial<Record<StorePlanKey, StorePriceInfo>>> {
  if (!isNativeBillingAvailable()) return {};
  try {
    const offerings = await Purchases.getOfferings();
    const offering =
      offerings.all?.[REVENUECAT_OFFERING_ID] ?? offerings.current ?? null;
    const packages: PurchasesPackage[] = offering?.availablePackages ?? [];

    const result: Partial<Record<StorePlanKey, StorePriceInfo>> = {};
    (Object.keys(STORE_PRODUCT_IDS) as StorePlanKey[]).forEach((plan) => {
      const productId = STORE_PRODUCT_IDS[plan];
      const pkg = packages.find(
        (p) =>
          p.product.identifier === productId ||
          p.product.identifier.startsWith(`${productId}:`)
      );
      if (pkg) {
        result[plan] = {
          priceString: pkg.product.priceString,
          price: pkg.product.price,
          currencyCode: pkg.product.currencyCode,
          productId: pkg.product.identifier,
        };
      }
    });
    return result;
  } catch (error) {
    logger.error(
      'Failed to load store offerings',
      error instanceof Error ? error : new Error(String(error))
    );
    return {};
  }
}

function activeEntitlement(info: CustomerInfo | undefined): StorePlanKey | null {
  const active = info?.entitlements?.active ?? {};
  if (active[RC_ENTITLEMENTS.premium]?.isActive) return 'premium';
  if (active[RC_ENTITLEMENTS.starter]?.isActive) return 'starter';
  return null;
}

/**
 * Pushes the RevenueCat entitlement state to Supabase (server-side verification
 * against the RevenueCat API) so the app entitlement never relies on the client.
 */
export async function syncEntitlementsToSupabase(userId: string): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('revenuecat-sync', {
      body: { app_user_id: userId },
    });
    if (error) logger.error('revenuecat-sync failed', error);
  } catch (error) {
    logger.error(
      'revenuecat-sync threw',
      error instanceof Error ? error : new Error(String(error))
    );
  } finally {
    clearPlanStatusCache(userId);
  }
}

/** Starts a Google Play / App Store purchase for the given paywall card. */
export async function startNativePurchase(
  choice: NativePaidChoice,
  userId: string
): Promise<NativePurchaseResult> {
  const plan = PLAN_BY_CHOICE[choice];

  if (!isNativeBillingAvailable()) {
    return {
      status: 'unavailable',
      message:
        "Les abonnements dans l'application ne sont pas encore disponibles sur cet appareil. Vous pouvez commencer avec l'essai gratuit.",
    };
  }

  const ready = await initNativeBilling(userId);
  if (!ready) {
    return {
      status: 'unavailable',
      message: "Le service d'abonnement est momentanément indisponible. Réessayez plus tard.",
    };
  }

  try {
    const offerings = await Purchases.getOfferings();
    const offering = offerings.all?.[REVENUECAT_OFFERING_ID] ?? offerings.current ?? null;
    const productId = STORE_PRODUCT_IDS[plan];
    const pkg = (offering?.availablePackages ?? []).find(
      (p) =>
        p.product.identifier === productId || p.product.identifier.startsWith(`${productId}:`)
    );

    if (!pkg) {
      return {
        status: 'unavailable',
        message: 'Cette formule n’est pas encore disponible sur votre compte Google Play.',
      };
    }

    const purchase = await Purchases.purchasePackage({ aPackage: pkg });
    const entitlement = activeEntitlement(purchase.customerInfo);

    // Always sync, so the server records the transaction even if the entitlement
    // is still being processed (deferred / pending payment methods).
    await syncEntitlementsToSupabase(userId);

    if (!entitlement) {
      return {
        status: 'pending',
        message:
          'Votre paiement est en cours de validation par Google Play. Votre formule sera activée dès sa confirmation.',
      };
    }

    return { status: 'purchased', productId: pkg.product.identifier, entitlement };
  } catch (error) {
    const err = error as { code?: string; message?: string; userCancelled?: boolean };
    if (
      err?.userCancelled ||
      err?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR
    ) {
      return { status: 'cancelled' };
    }
    if (err?.code === PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR) {
      await syncEntitlementsToSupabase(userId);
      return {
        status: 'pending',
        message:
          'Votre paiement est en attente auprès de Google Play. Votre formule sera activée automatiquement.',
      };
    }
    if (err?.code === PURCHASES_ERROR_CODE.PRODUCT_ALREADY_PURCHASED_ERROR) {
      await syncEntitlementsToSupabase(userId);
      return {
        status: 'purchased',
        productId: STORE_PRODUCT_IDS[plan],
        entitlement: plan,
      };
    }
    logger.error(
      'Native purchase failed',
      error instanceof Error ? error : new Error(String(err?.message ?? 'unknown'))
    );
    return {
      status: 'error',
      message: err?.message || "L'achat n'a pas pu être finalisé. Réessayez.",
    };
  }
}

/** Restores store purchases (new phone, reinstall, account restored). */
export async function restoreNativePurchases(userId: string): Promise<RestoreResult> {
  if (!isNativeBillingAvailable()) {
    return {
      status: 'unavailable',
      message: 'La restauration des achats est disponible uniquement dans l’application mobile.',
    };
  }
  const ready = await initNativeBilling(userId);
  if (!ready) {
    return { status: 'unavailable', message: 'Service indisponible. Réessayez plus tard.' };
  }
  try {
    const { customerInfo } = await Purchases.restorePurchases();
    await syncEntitlementsToSupabase(userId);
    const entitlement = activeEntitlement(customerInfo);
    return entitlement ? { status: 'restored', entitlement } : { status: 'nothing' };
  } catch (error) {
    const err = error as { message?: string };
    logger.error(
      'Restore failed',
      error instanceof Error ? error : new Error(String(err?.message ?? 'unknown'))
    );
    return { status: 'error', message: err?.message || 'Restauration impossible.' };
  }
}

/** Store subscription management URL (Google Play / App Store), when available. */
export async function getSubscriptionManagementUrl(userId: string): Promise<string | null> {
  if (!isNativeBillingAvailable()) return null;
  try {
    const ready = await initNativeBilling(userId);
    if (!ready) return null;
    const { customerInfo } = await Purchases.getCustomerInfo();
    return customerInfo.managementURL ?? null;
  } catch {
    return null;
  }
}
