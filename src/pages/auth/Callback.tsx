import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Auth Callback — lets Supabase handle the PKCE exchange automatically
 * via detectSessionInUrl: true. We only listen for the session to appear.
 *
 * Query params preserved:
 *   ?redirect=/some-path   → navigate there instead of /app
 *   ?from_checkout=true     → navigate to /post-checkout-profile
 */
export default function Callback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.substring(1));

    // Check for error in URL (both query and hash)
    const urlError = queryParams.get('error') || hashParams.get('error');
    if (urlError) {
      const desc =
        queryParams.get('error_description') ||
        hashParams.get('error_description') ||
        urlError;
      setError(decodeURIComponent(desc.replace(/\+/g, ' ')));
      return;
    }

    // Determine destination after auth
    const getDestination = (): string => {
      if (queryParams.get('from_checkout') === 'true') return '/post-checkout-profile';
      const redirect = queryParams.get('redirect');
      if (redirect && redirect.startsWith('/')) return redirect;
      return '/app';
    };

    // Let Supabase handle the PKCE exchange automatically.
    // We just listen for the session to be established.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('[AuthCallback] Auth event:', event, 'User:', session?.user?.email);

        if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION')) {
          console.log('[AuthCallback] Sign-in successful, redirecting...');
          subscription.unsubscribe();
          window.location.replace(getDestination());
        }
      },
    );

    // Fallback timeout — if no auth event after 12s, check session or show error
    const timeout = setTimeout(() => {
      subscription.unsubscribe();

      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          window.location.replace(getDestination());
        } else {
          setError('La connexion a pris trop de temps. Veuillez réessayer.');
        }
      });
    }, 12_000);

    return () => {
      clearTimeout(timeout);
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
