/**
 * Native-only (Capacitor) local UI state.
 *
 * Capacitor Preferences stores only device-level UI state.
 * It is never the source of truth for subscriptions or entitlements.
 */

import { Preferences } from '@capacitor/preferences';
import { isNativePlatform } from '@/lib/platform';
import type { NativeOfferChoice } from '@/config/nativeOffers';

const INTRO_SEEN_KEY = 'nutrizen.native.introSeen';

export async function hasSeenNativeIntro(): Promise<boolean> {
  if (!isNativePlatform()) return true;

  try {
    const { value } = await Preferences.get({
      key: INTRO_SEEN_KEY,
    });

    return value === '1';
  } catch (error) {
    console.error('[NativeStartup] Failed to read intro state', error);
    return false;
  }
}

export async function markNativeIntroSeen(): Promise<void> {
  if (!isNativePlatform()) return;

  try {
    await Preferences.set({
      key: INTRO_SEEN_KEY,
      value: '1',
    });
  } catch (error) {
    console.error('[NativeStartup] Failed to save intro state', error);
  }
}

/** Paywall card identifiers (UI only, see src/config/nativeOffers.ts). */
export type NativePlanChoice = NativeOfferChoice;

const PLAN_INTENT_KEY = 'nutrizen.native.planIntent';

/**
 * Local UI intent only: which card the user tapped on the public plans screen
 * before creating an account. Never an entitlement — the real plan always comes
 * from Supabase.
 */
export async function saveNativePlanIntent(choice: NativePlanChoice): Promise<void> {
  if (!isNativePlatform()) return;
  try {
    await Preferences.set({ key: PLAN_INTENT_KEY, value: choice });
  } catch (error) {
    console.error('[NativeStartup] Failed to save plan intent', error);
  }
}

export async function readNativePlanIntent(): Promise<NativePlanChoice | null> {
  if (!isNativePlatform()) return null;
  try {
    const { value } = await Preferences.get({ key: PLAN_INTENT_KEY });
    if (value === 'free' || value === 'premium' || value === 'premium_plus') return value;
    return null;
  } catch (error) {
    console.error('[NativeStartup] Failed to read plan intent', error);
    return null;
  }
}

export async function clearNativePlanIntent(): Promise<void> {
  if (!isNativePlatform()) return;
  try {
    await Preferences.remove({ key: PLAN_INTENT_KEY });
  } catch (error) {
    console.error('[NativeStartup] Failed to clear plan intent', error);
  }
}