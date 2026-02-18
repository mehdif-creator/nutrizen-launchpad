import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createLogger } from '@/lib/logger';

const logger = createLogger('AuthCallback');

/**
 * Auth Callback — handles both PKCE (?code=) and legacy hash (#access_token=) flows.
 *
 * PKCE (current): Supabase redirects here with ?code=... which we exchange for a session.
 * Legacy/implicit: Supabase redirects with #access_token=... which detectSessionInUrl parses.
 *
 * Query params preserved:
 *   ?redirect=/some-path  → navigate there instead of /app
 *   ?from_checkout=true    → navigate to /post-checkout-profile
 */
export default function Callback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const resolvedRef = useRef(false);

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.substring(1));

    // Determine destination after auth
    const getDestination = (): string => {
      if (queryParams.get('from_checkout') === 'true') return '/post-checkout-profile';
      const redirect = queryParams.get('redirect');
      if (redirect && redirect.startsWith('/')) return redirect;
      return '/app';
    };

    const resolve = (path: string) => {
      if (resolvedRef.current) return;
      resolvedRef.current = true;
      logger.info('Resolving to', { path });
      navigate(path, { replace: true });
    };

    const fail = (msg: string) => {
      if (resolvedRef.current) return;
      resolvedRef.current = true;
      logger.error('Failed', new Error(msg));
      setError(msg);
    };

    // ── Check for error in URL (both query and hash) ────────────────────
    const urlError = queryParams.get('error') || hashParams.get('error');
    if (urlError) {
      const desc = queryParams.get('error_description')
        || hashParams.get('error_description')
        || urlError;
      fail(decodeURIComponent(desc.replace(/\+/g, ' ')));
      return;
    }

    // ── Hard timeout — 15 seconds ───────────────────────────────────────
    const hardTimeout = setTimeout(() => {
      fail('La connexion a pris trop de temps. Veuillez réessayer.');
    }, 15_000);

    // ── PKCE flow: exchange ?code= for session ──────────────────────────
    const code = queryParams.get('code');
    if (code) {
      logger.debug('PKCE code detected, exchanging for session');
      supabase.auth.exchangeCodeForSession(code)
        .then(({ data, error: exchangeError }) => {
          if (exchangeError) {
            logger.error('Code exchange failed', exchangeError);
            // Don't fail immediately — the onAuthStateChange listener may still pick up the session
            return;
          }
          if (data.session) {
            clearTimeout(hardTimeout);
            resolve(getDestination());
          }
        })
        .catch((err) => {
          logger.error('Code exchange threw', err);
        });
    }

    // ── Immediate session check (hash tokens may already be parsed) ─────
    supabase.auth.getSession().then(({ data: { session } }) => {
      logger.debug('getSession() immediate', { hasSession: !!session });
      if (session) {
        clearTimeout(hardTimeout);
        resolve(getDestination());
      }
    });

    // ── Listen for auth state changes ───────────────────────────────────
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        logger.debug('Auth event', { event, hasSession: !!session });
        if (session && (
          event === 'INITIAL_SESSION' ||
          event === 'SIGNED_IN' ||
          event === 'TOKEN_REFRESHED'
        )) {
          clearTimeout(hardTimeout);
          clearInterval(retryInterval);
          subscription.unsubscribe();
          resolve(getDestination());
        }
      }
    );

    // ── Poll as belt-and-suspenders ─────────────────────────────────────
    let retryCount = 0;
    const retryInterval = setInterval(async () => {
      retryCount++;
      if (resolvedRef.current || retryCount > 20) {
        clearInterval(retryInterval);
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        clearInterval(retryInterval);
        clearTimeout(hardTimeout);
        subscription.unsubscribe();
        resolve(getDestination());
      }
    }, 500);

    return () => {
      clearTimeout(hardTimeout);
      clearInterval(retryInterval);
      subscription.unsubscribe();
    };
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-accent/10 to-primary/10 dark:from-accent/5 dark:to-primary/5 p-4">
        <div className="w-full max-w-md bg-card rounded-2xl shadow-card p-8">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-xl font-semibold text-foreground">Erreur d'authentification</h2>
            <p className="text-muted-foreground">{error}</p>
            <div className="space-y-2">
              <Button
                onClick={() => navigate('/auth/login', { replace: true })}
                className="w-full"
              >
                Retour à la connexion
              </Button>
              <Button
                onClick={() => navigate('/', { replace: true })}
                variant="outline"
                className="w-full"
              >
                Retour à l'accueil
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-accent/10 to-primary/10 dark:from-accent/5 dark:to-primary/5">
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
        <h2 className="text-xl font-semibold text-foreground">Connexion en cours...</h2>
        <p className="text-muted-foreground">Veuillez patienter</p>
      </div>
    </div>
  );
}
