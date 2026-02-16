import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Callback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let handled = false;

    const succeed = () => {
      if (handled) return;
      handled = true;
      clearTimeout(hardTimeout);
      console.log('[AUTH-CALLBACK] Session established, redirecting to /app');
      navigate('/app', { replace: true });
    };

    const fail = (msg: string) => {
      if (handled) return;
      handled = true;
      clearTimeout(hardTimeout);
      console.error('[AUTH-CALLBACK] Error:', msg);
      setError(msg);
    };

    // Check for errors in URL hash or query params
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const searchParams = new URLSearchParams(window.location.search);

    const errorParam = searchParams.get('error') || hashParams.get('error');
    if (errorParam) {
      const desc = searchParams.get('error_description')
        || hashParams.get('error_description')
        || errorParam;
      fail(desc);
      return;
    }

    // Hard timeout — 12 seconds
    const hardTimeout = setTimeout(() => {
      fail('La connexion a pris trop de temps. Veuillez réessayer.');
    }, 12000);

    // With flowType: "implicit" + detectSessionInUrl: true,
    // Supabase JS automatically extracts #access_token from the URL hash
    // and fires onAuthStateChange with SIGNED_IN.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('[AUTH-CALLBACK] Auth event:', event);
        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
          succeed();
        }
      }
    );

    // Fallback: session may already be set if Supabase parsed the hash
    // before our listener was attached (race condition)
    const fallbackTimer = setTimeout(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          console.log('[AUTH-CALLBACK] Session found via fallback check');
          succeed();
        }
      } catch (e) {
        console.error('[AUTH-CALLBACK] Fallback check error:', e);
      }
    }, 800);

    return () => {
      clearTimeout(hardTimeout);
      clearTimeout(fallbackTimer);
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
