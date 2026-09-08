import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { isNativePlatform, NATIVE_AUTH_CALLBACK_URL } from '@/lib/platform';
import { createLogger } from '@/lib/logger';

const logger = createLogger('NativeAuthDeepLink');

/** Where to go once the native OAuth callback has been consumed. */
function destinationFromCallback(url: URL): string {
  const params = url.searchParams;
  if (params.get('from_checkout') === 'true') return '/post-checkout-profile';
  const redirect = params.get('redirect');
  if (redirect && redirect.startsWith('/')) return redirect;
  return '/app/dashboard';
}

/**
 * Native-only (Capacitor). Listens for `nutrizen://auth/callback` deep links,
 * restores the Supabase session (PKCE code → exchangeCodeForSession, or
 * implicit tokens → setSession as a fallback) and navigates into the app.
 * No-op on the web.
 */
export function useNativeAuthDeepLink() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isNativePlatform()) return;

    let cancelled = false;
    let removeListener: (() => void) | undefined;

    const handleUrl = async (rawUrl: string | null | undefined) => {
      if (!rawUrl || !rawUrl.startsWith(NATIVE_AUTH_CALLBACK_URL)) return;
      logger.debug('Handling auth deep link');

      // Close the system browser (iOS SFSafariViewController; no-op on Android Custom Tabs)
      try {
        const { Browser } = await import('@capacitor/browser');
        await Browser.close();
      } catch {
        /* ignore */
      }

      let url: URL;
      try {
        url = new URL(rawUrl);
      } catch {
        logger.error('Invalid deep link URL');
        return;
      }

      const error = url.searchParams.get('error_description') || url.searchParams.get('error');
      if (error) {
        logger.error('OAuth error in deep link', new Error(error));
        navigate('/auth/login', { replace: true });
        return;
      }

      try {
        const code = url.searchParams.get('code');
        if (code) {
          // PKCE flow (the one configured in this project)
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        } else {
          // Implicit-flow fallback: tokens in the hash fragment
          const hash = new URLSearchParams(url.hash.replace(/^#/, ''));
          const access_token = hash.get('access_token');
          const refresh_token = hash.get('refresh_token');
          if (!access_token || !refresh_token) {
            throw new Error('No code or tokens in auth deep link');
          }
          const { error: setError } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (setError) throw setError;
        }
        if (!cancelled) navigate(destinationFromCallback(url), { replace: true });
      } catch (e) {
        logger.error('Failed to restore session from deep link', e instanceof Error ? e : new Error(String(e)));
        if (!cancelled) navigate('/auth/login', { replace: true });
      }
    };

    (async () => {
      const { App } = await import('@capacitor/app');

      // Cold start via deep link
      try {
        const launch = await App.getLaunchUrl();
        await handleUrl(launch?.url);
      } catch {
        /* ignore */
      }

      // Warm start / app already running
      const handle = await App.addListener('appUrlOpen', ({ url }) => {
        void handleUrl(url);
      });
      if (cancelled) {
        void handle.remove();
      } else {
        removeListener = () => void handle.remove();
      }
    })();

    return () => {
      cancelled = true;
      removeListener?.();
    };
  }, [navigate]);
}
