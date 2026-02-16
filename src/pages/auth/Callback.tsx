import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createLogger } from '@/lib/logger';

const logger = createLogger('AuthCallback');

export default function Callback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const resolvedRef = useRef(false);

  useEffect(() => {
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

    // Step 1: Check for errors in URL
    const hash = window.location.hash.substring(1);
    const hashParams = new URLSearchParams(hash);
    const queryParams = new URLSearchParams(window.location.search);

    const urlError = queryParams.get('error') || hashParams.get('error');
    if (urlError) {
      const desc = queryParams.get('error_description')
        || hashParams.get('error_description')
        || urlError;
      fail(decodeURIComponent(desc.replace(/\+/g, ' ')));
      return;
    }

    logger.debug('Has access_token in hash', { hasToken: hashParams.has('access_token') });

    // Step 2: Hard timeout — 15 seconds
    const hardTimeout = setTimeout(() => {
      fail('La connexion a pris trop de temps. Veuillez réessayer.');
    }, 15000);

    // Step 3: CRITICAL — Check session IMMEDIATELY (0ms)
    // Supabase may have already parsed the hash during createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      logger.debug('getSession() immediate', { hasSession: !!session });
      if (session) {
        clearTimeout(hardTimeout);
        resolve('/app');
      }
    });

    // Step 4: Listen for ALL auth events including INITIAL_SESSION
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
          resolve('/app');
        }
      }
    );

    // Step 5: Poll getSession() every 500ms as belt-and-suspenders
    let retryCount = 0;
    const retryInterval = setInterval(async () => {
      retryCount++;
      if (resolvedRef.current || retryCount > 16) {
        clearInterval(retryInterval);
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        clearInterval(retryInterval);
        clearTimeout(hardTimeout);
        subscription.unsubscribe();
        resolve('/app');
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
                onClick={() => window.location.href = '/auth/login'}
                className="w-full"
              >
                Retour à la connexion
              </Button>
              <Button
                onClick={() => window.location.href = '/'}
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
