/**
 * Native-only (Capacitor) local startup state, persisted with Capacitor Preferences.
 *
 * Only *local UI* facts live here (has the intro been shown? has the user
 * already made a plan choice on this device?). Account and subscription truth
 * always stays in Supabase.
 *
 * On the web every function is a safe no-op so the browser flow is unchanged.
 */
import { isNativePlatform } from '@/lib/platform';

const INTRO_SEEN_KEY = 'nutrizen.native.introSeen';
const PAYWALL_CHOICE_PREFIX = 'nutrizen.native.paywallChoice.';

export type NativePlanChoice = 'free' | 'premium' | 'premium_plus';

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

export async function getNativePlanChoice(userId: string): Promise<NativePlanChoice | null> {
  if (!isNativePlatform()) return 'free';
  try {
    const { value } = await (await prefs()).get({ key: PAYWALL_CHOICE_PREFIX + userId });
    if (value === 'free' || value === 'premium' || value === 'premium_plus') return value;
    return null;
  } catch {
    return null;
  }
}

export async function setNativePlanChoice(
  userId: string,
  choice: NativePlanChoice
): Promise<void> {
  if (!isNativePlatform()) return;
  try {
    await (await prefs()).set({ key: PAYWALL_CHOICE_PREFIX + userId, value: choice });
  } catch {
    /* ignore */
  }
}
