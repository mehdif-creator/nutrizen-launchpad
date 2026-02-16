import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Callback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let handled = false;

    const getRedirectPath = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const redirectPath = urlParams.get('redirect');
      if (redirectPath && redirectPath.startsWith('/')) return redirectPath;
      if (urlParams.get('from_checkout') === 'true') return '/app';
      return '/app';
    };

    // Listen for auth state change — this fires when Supabase processes
    // the access_token from the URL hash (implicit OAuth flow)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (handled) return;
        console.log('[AUTH-CALLBACK] Auth state change:', event);

        if (event === 'SIGNED_IN' && session) {
          handled = true;
          console.log('[AUTH-CALLBACK] Session established for:', session.user.email);
          navigate(getRedirectPath(), { replace: true });
        }
      }
    );

    // Also handle PKCE flow (code in search params, no hash token)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const hasAccessToken = hashParams.has('access_token');

    if (!hasAccessToken) {
      // PKCE flow: exchange code for session
      const handlePKCE = async () => {
        try {
          console.log('[AUTH-CALLBACK] Attempting PKCE code exchange...');
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(window.location.href);

          if (exchangeError) {
            console.error('[AUTH-CALLBACK] Exchange error:', exchangeError);
            if (exchangeError.message.includes('expired')) {
              setError('Le lien a expiré. Veuillez demander un nouveau lien de connexion.');
            } else if (exchangeError.message.includes('already been consumed')) {
              setError('Ce lien a déjà été utilisé. Veuillez demander un nouveau lien.');
            } else {
              setError('Erreur d\'authentification. Veuillez réessayer.');
            }
            setLoading(false);
            return;
          }

          if (data.session) {
            handled = true;
            console.log('[AUTH-CALLBACK] PKCE session created:', data.session.user.email);
            navigate(getRedirectPath(), { replace: true });
          } else {
            setError('Impossible de créer la session. Veuillez réessayer.');
            setLoading(false);
          }
        } catch (err) {
          console.error('[AUTH-CALLBACK] Unexpected error:', err);
          setError('Une erreur inattendue s\'est produite.');
          setLoading(false);
        }
      };
      handlePKCE();
    }

    // Timeout: if nothing happens after 10s, show error
    const timeout = setTimeout(() => {
      if (!handled) {
        console.error('[AUTH-CALLBACK] Timeout — session never established');
        setError('La connexion a pris trop de temps. Veuillez réessayer.');
        setLoading(false);
      }
    }, 10000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [navigate]);

  if (loading) {
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
                onClick={() => navigate('/auth/login')}
                className="w-full"
              >
                Retour à la connexion
              </Button>
              <Button
                onClick={() => navigate('/')}
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

  return null;
}
