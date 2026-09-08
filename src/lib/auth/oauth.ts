import { supabase } from '@/integrations/supabase/client';
import { isNativePlatform, NATIVE_AUTH_CALLBACK_URL } from '@/lib/platform';

interface GoogleSignInOptions {
  /** Query string appended to the web callback, e.g. `?redirect=%2Fapp%2Fcredits`. */
  callbackQuery?: string;
  queryParams?: Record<string, string>;
}

/**
 * Google OAuth entry point shared by Login / Signup / PostCheckout.
 *
 * Web (unchanged): Supabase redirects the browser to
 *   `${window.location.origin}/auth/callback${callbackQuery}`.
 *
 * Capacitor (Android/iOS): the OAuth URL is opened in the system browser and
 * Google/Supabase redirect back to `nutrizen://auth/callback`, which is handled
 * by the `appUrlOpen` listener (see useNativeAuthDeepLink).
 */
export async function signInWithGoogle({ callbackQuery = '', queryParams }: GoogleSignInOptions = {}) {
  if (!isNativePlatform()) {
    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback${callbackQuery}`,
        ...(queryParams ? { queryParams } : {}),
      },
    });
  }

  const { Browser } = await import('@capacitor/browser');
  const result = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${NATIVE_AUTH_CALLBACK_URL}${callbackQuery}`,
      skipBrowserRedirect: true,
      ...(queryParams ? { queryParams } : {}),
    },
  });

  if (!result.error && result.data.url) {
    await Browser.open({ url: result.data.url, presentationStyle: 'popover' });
  }
  return result;
}
