/**
 * Native-only (Capacitor) local UI state.
 *
 * Capacitor Preferences stores only device-level UI state.
 * It is never the source of truth for subscriptions or entitlements.
 */

import { Preferences } from '@capacitor/preferences';
import { isNativePlatform } from '@/lib/platform';

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

/** Paywall card identifiers mapped to profiles.plan_selection. */
export type NativePlanChoice = 'trial' | 'starter' | 'premium';