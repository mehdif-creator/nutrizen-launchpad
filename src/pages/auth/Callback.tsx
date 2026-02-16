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
    let timeoutId: ReturnType<typeof setTimeout>;

    const getRedirectPath = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const redirectPath = urlParams.get('redirect');
      if (redirectPath && redirectPath.startsWith('/')) return redirectPath;
      if (urlParams.get('from_checkout') === 'true') return '/app';
      return '/app';
    };

    const succeed = () => {
      if (handled) return;
      handled = true;
      clearTimeout(timeoutId);
      console.log('[AUTH-CALLBACK] Session established, redirecting');
      navigate(getRedirectPath(), { replace: true });
    };

    const fail = (msg: string) => {
      if (handled) return;
      handled = true;
      clearTimeout(timeoutId);
      console.error('[AUTH-CALLBACK] Error:', msg);
      setError(msg);
      setLoading(false);
    };

    // Check for error params in URL
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const errorParam = urlParams.get('error') || hashParams.get('error');
    
    if (errorParam) {
      const desc = urlParams.get('error_description') 
        || hashParams.get('error_description') 
        || errorParam;
      fail(desc);
      return;
    }

    // Hard timeout
    timeoutId = setTimeout(() => {
      fail('La connexion a pris trop de temps. Veuillez réessayer.');
    }, 10000);

    // Listen for auth state change (catches both hash and PKCE flows)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('[AUTH-CALLBACK] Auth event:', event);
        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
          succeed();
        }
      }
    );

    // Determine flow type
    const hasAccessToken = hashParams.has('access_token');
    const hasCode = urlParams.has('code');

    const handleAuth = async () => {
      try {
        if (hasCode) {
          // PKCE flow: exchange code for session
          console.log('[AUTH-CALLBACK] PKCE flow detected, exchanging code...');
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(window.location.href);
          
          if (exchangeError) {
            if (exchangeError.message.includes('expired')) {
              fail('Le lien a expiré. Veuillez demander un nouveau lien de connexion.');
            } else if (exchangeError.message.includes('already been consumed')) {
              fail('Ce lien a déjà été utilisé. Veuillez demander un nouveau lien.');
            } else {
              fail(exchangeError.message);
            }
            return;
          }
          
          if (data.session) {
            succeed();
          }
          return;
        }

        if (hasAccessToken) {
          // Hash/implicit flow: Supabase auto-processes the hash.
          // The onAuthStateChange listener above should catch SIGNED_IN.
          // But if it already fired before our listener was attached,
          // we need to check getSession() as a fallback.
          console.log('[AUTH-CALLBACK] Hash flow detected, checking session...');
        }

        // Fallback: check if session already exists (race condition fix)
        // Give Supabase a moment to process the hash
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          console.log('[AUTH-CALLBACK] Session already exists (fallback)');
          succeed();
          return;
        }

        // If no hash and no code, try once more after a delay
        if (!hasAccessToken && !hasCode) {
          // Maybe direct navigation or already processed
          await new Promise(resolve => setTimeout(resolve, 1000));
          const { data: { session: retrySession } } = await supabase.auth.getSession();
          if (retrySession) {
            succeed();
          }
        }
      } catch (err) {
        console.error('[AUTH-CALLBACK] Unexpected error:', err);
        fail('Une erreur inattendue s\'est produite.');
      }
    };

    handleAuth();

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeoutId);
    };
  }, [navigate]);

  if (loading && !error) {
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
