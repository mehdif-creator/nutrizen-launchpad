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
        
        // Get the current URL with all parameters
        const currentUrl = window.location.href;
        console.log('[AUTH-CALLBACK] Current URL:', currentUrl);

        // Exchange code for session
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(currentUrl);
        
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-accent/10 to-primary/10">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <h2 className="text-xl font-semibold">Connexion en cours...</h2>
          <p className="text-muted-foreground">Veuillez patienter</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-accent/10 to-primary/10 p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-card p-8">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-xl font-semibold">Erreur d'authentification</h2>
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
