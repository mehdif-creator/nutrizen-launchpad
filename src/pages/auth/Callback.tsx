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
    const handleCallback = async () => {
      try {
        console.log('[AUTH-CALLBACK] Processing authentication callback...');
        
        // Check if we have the hash params (for implicit flow) or search params (for PKCE)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const searchParams = new URLSearchParams(window.location.search);
        
        // Get code from either hash or search params
        const code = searchParams.get('code') || hashParams.get('code');
        
        console.log('[AUTH-CALLBACK] Auth code present:', !!code);
        console.log('[AUTH-CALLBACK] Hash:', window.location.hash);
        console.log('[AUTH-CALLBACK] Search:', window.location.search);

        // If we have hash params (implicit flow from OAuth), try to get session directly
        if (hashParams.has('access_token')) {
          console.log('[AUTH-CALLBACK] Using implicit flow (access token in hash)');
          const { error: sessionError } = await supabase.auth.getSession();
          if (sessionError) {
            console.error('[AUTH-CALLBACK] Session error:', sessionError);
            throw sessionError;
          }
          navigate('/app', { replace: true });
          return;
        }

        // Otherwise use PKCE flow
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(window.location.href);
        
        if (exchangeError) {
          console.error('[AUTH-CALLBACK] Exchange error:', exchangeError);
          
          // Handle specific error types
          if (exchangeError.message.includes('expired')) {
            setError('Le lien a expiré. Veuillez demander un nouveau lien de connexion.');
          } else if (exchangeError.message.includes('already been consumed')) {
            setError('Ce lien a déjà été utilisé. Veuillez demander un nouveau lien.');
          } else if (exchangeError.message.includes('URL not allowed')) {
            setError('URL de redirection non autorisée. Veuillez contacter le support.');
          } else {
            setError('Erreur d\'authentification. Veuillez réessayer.');
          }
          setLoading(false);
          return;
        }

        if (data.session) {
          console.log('[AUTH-CALLBACK] Session created successfully:', data.session.user.email);
          
          // Check if user came from post-checkout flow
          const urlParams = new URLSearchParams(window.location.search);
          const fromCheckout = urlParams.get('from_checkout') === 'true';
          
          if (fromCheckout) {
            console.log('[AUTH-CALLBACK] Redirecting to app from checkout');
            navigate('/app', { replace: true });
          } else {
            console.log('[AUTH-CALLBACK] Redirecting to app');
            navigate('/app', { replace: true });
          }
        } else {
          console.error('[AUTH-CALLBACK] No session created');
          setError('Impossible de créer la session. Veuillez réessayer.');
          setLoading(false);
        }
      } catch (err) {
        console.error('[AUTH-CALLBACK] Unexpected error:', err);
        setError('Une erreur inattendue s\'est produite.');
        setLoading(false);
      }
    };

    handleCallback();
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
