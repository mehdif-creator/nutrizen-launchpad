import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CheckCircle, Mail, Loader2, Chrome } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export default function PostCheckout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [countdown, setCountdown] = useState(10);
  const [googleLoading, setGoogleLoading] = useState(false);
  
  const sessionId = searchParams.get('session_id');
  const email = searchParams.get('email');
  const fallback = searchParams.get('fallback') === 'true';
  const error = searchParams.get('error');

  useEffect(() => {
    // If user is already authenticated, redirect to profile completion
    if (!authLoading && user) {
      navigate('/post-checkout-profile', { replace: true });
      return;
    }

    // Countdown timer only if not authenticated
    if (!authLoading && !user) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            navigate('/auth/login');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [navigate, user, authLoading]);

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?from_checkout=true`,
        },
      });

      if (error) {
        toast({
          title: 'Erreur',
          description: 'Impossible de se connecter avec Google. Veuillez réessayer.',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('Google login error:', err);
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la connexion.',
        variant: 'destructive',
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  // Show loading while checking auth status
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-accent/10 to-primary/10 p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-2xl shadow-card p-8 md:p-12">
          <div className="text-center space-y-6">
            {/* Success Icon */}
            <div className="flex justify-center">
              <div className="relative">
                <CheckCircle className="h-20 w-20 text-primary animate-pulse" />
                <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                🎉 Paiement confirmé !
              </h1>
              <p className="text-xl text-muted-foreground">
                Bienvenue dans la famille NutriZen
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-6">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* Instructions */}
            <div className="bg-accent/10 rounded-xl p-6 space-y-4">
              <div className="flex items-start gap-4">
                <Mail className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                <div className="text-left space-y-2">
                  {fallback ? (
                    <>
                      <h3 className="font-semibold text-lg">Connecte-toi pour accéder à ton compte</h3>
                      <p className="text-sm text-muted-foreground">
                        Ton paiement a bien été enregistré ! 
                        {email && <span className="block mt-2">Email: <strong>{email}</strong></span>}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Choisis une méthode de connexion ci-dessous :
                      </p>
                    </>
                  ) : (
                    <>
                      <h3 className="font-semibold text-lg">Vérification en cours...</h3>
                      <p className="text-sm text-muted-foreground">
                        Nous créons ton compte et préparons ton espace personnel. 
                        <strong className="text-foreground"> Tu vas recevoir un email avec un lien magique</strong> pour accéder à ton tableau de bord.
                      </p>
                      <p className="text-sm text-muted-foreground">
                        ⏱️ Cela peut prendre quelques instants. Si tu ne reçois pas l'email :
                      </p>
                      <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 ml-2">
                        <li>Vérifie tes <strong>spams/courrier indésirable</strong></li>
                        <li>Attends 2-3 minutes (le traitement peut prendre un peu de temps)</li>
                        <li>Connecte-toi avec Google ci-dessous</li>
                      </ul>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Google Login Option */}
            <div className="space-y-3">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-muted-foreground">
                    {fallback ? 'Connexion rapide' : 'Ou connexion rapide'}
                  </span>
                </div>
              </div>

              <Button
                onClick={handleGoogleLogin}
                disabled={googleLoading}
                variant="outline"
                size="lg"
                className="w-full"
              >
                {googleLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connexion en cours...
                  </>
                ) : (
                  <>
                    <Chrome className="mr-2 h-4 w-4" />
                    Continuer avec Google
                  </>
                )}
              </Button>
            </div>

            {/* Session ID for debugging */}
            {sessionId && (
              <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                ID de session : {sessionId}
              </div>
            )}

            {/* Auto-redirect indicator */}
            <div className="pt-4 space-y-3">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Redirection automatique dans {countdown}s...</span>
              </div>
              
              <Button
                onClick={() => navigate('/auth/login')}
                variant="outline"
                size="lg"
                className="w-full"
              >
                Aller à la page de connexion maintenant
              </Button>
            </div>

            {/* Support link */}
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Besoin d'aide ?{' '}
                <a href="/contact" className="text-primary hover:underline font-medium">
                  Contacte notre support
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Back to home */}
        <div className="text-center mt-4">
          <a href="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Retour à l'accueil
          </a>
        </div>
      </div>
    </div>
  );
}
