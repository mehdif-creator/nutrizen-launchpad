/**
 * Native-only (Capacitor) **local UI state**, persisted with Capacitor Preferences.
 *
 * Preferences holds *only* device-level interface facts (has the native intro
 * been shown on this device?). It is NEVER the source of truth for the plan,
 * the subscription status or entitlements — those live in Supabase, see
 * `src/lib/native/planStatus.ts`.
 *
 * On the web every function is a safe no-op so the browser flow is unchanged.
 */
import { isNativePlatform } from '@/lib/platform';

const INTRO_SEEN_KEY = 'nutrizen.native.introSeen';

async function prefs() {
  const { Preferences } = await import('@capacitor/preferences');
  return Preferences;
}

export async function hasSeenNativeIntro(): Promise<boolean> {
  if (!isNativePlatform()) return true;
  try {
    const { value } = await (await prefs()).get({ key: INTRO_SEEN_KEY });
    return value === '1';
  } catch {
    return false;
  }
}

export async function markNativeIntroSeen(): Promise<void> {
  if (!isNativePlatform()) return;
  try {
    await (await prefs()).set({ key: INTRO_SEEN_KEY, value: '1' });
  } catch {
    /* ignore */
  }
}

/** Paywall card identifiers (UI only). Mapped to Supabase `plan_selection`. */
export type NativePlanChoice = 'free' | 'premium' | 'premium_plus';
