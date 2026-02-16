import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2, Chrome, AlertCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export default function PostCheckout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<'polling' | 'ready' | 'redirecting' | 'error'>('polling');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const pollCount = useRef(0);
  const maxPolls = 60; // 60 × 3s = 3 min max
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const token = searchParams.get('token');
  const urlError = searchParams.get('error');

  // If already authenticated, go to profile completion
  useEffect(() => {
    if (!authLoading && user) {
      navigate('/post-checkout-profile', { replace: true });
    }
  }, [authLoading, user, navigate]);

  const pollTokenStatus = useCallback(async () => {
    if (!token) return;

    pollCount.current++;
    if (pollCount.current > maxPolls) {
      setStatus('error');
      setErrorMessage('Le traitement prend plus de temps que prévu. Connecte-toi manuellement.');
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      return;
    }

    try {
      const res = await supabase.functions.invoke('post-checkout-login', {
        method: 'POST',
        body: { token },
      });

      const data = res.data;

      if (!data) {
        // Network error or non-JSON response
        return;
      }

      if (data.ready === false) {
        // Still pending — keep polling
        return;
      }

      if (data.ready === true && data.redirect) {
        // Token consumed, redirect to magic link
        setStatus('redirecting');
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        window.location.href = data.redirect;
        return;
      }

      if (data.code === 'TOKEN_EXPIRED' || data.code === 'TOKEN_CONSUMED') {
        setStatus('error');
        setErrorMessage(data.message || 'Token expiré. Connecte-toi manuellement.');
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        return;
      }

      if (data.code === 'INVALID_TOKEN') {
        setStatus('error');
        setErrorMessage('Lien invalide. Connecte-toi manuellement.');
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        return;
      }
    } catch {
      // Transient error — keep polling
    }
  }, [token]);

  useEffect(() => {
    if (!token || authLoading || user) return;

    if (urlError) {
      setStatus('error');
      setErrorMessage(decodeURIComponent(urlError.replace(/\+/g, ' ')));
      return;
    }

    // Start polling immediately, then every 3 seconds
    pollTokenStatus();
    pollIntervalRef.current = setInterval(pollTokenStatus, 3000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [token, urlError, authLoading, user, pollTokenStatus]);

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
    } catch {
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la connexion.',
        variant: 'destructive',
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  // Loading auth state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // No token provided
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-accent/10 to-primary/10 p-4">
        <div className="w-full max-w-md bg-card rounded-2xl shadow-card p-8 text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <h2 className="text-xl font-semibold text-foreground">Lien invalide</h2>
          <p className="text-muted-foreground">Ce lien de confirmation est invalide ou a expiré.</p>
          <Button onClick={() => navigate('/auth/login')} className="w-full">
            Aller à la connexion
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-accent/10 to-primary/10 p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-card rounded-2xl shadow-card p-8 md:p-12">
          <div className="text-center space-y-6">

            {/* Status Icon */}
            <div className="flex justify-center">
              {status === 'error' ? (
                <AlertCircle className="h-20 w-20 text-destructive" />
              ) : status === 'redirecting' ? (
                <CheckCircle className="h-20 w-20 text-primary" />
              ) : (
                <div className="relative">
                  <CheckCircle className="h-20 w-20 text-primary animate-pulse" />
                  <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                </div>
              )}
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

            {/* Status Message */}
            {status === 'polling' && (
              <div className="bg-accent/10 rounded-xl p-6 space-y-3">
                <div className="flex items-center justify-center gap-3">
                  <Clock className="h-5 w-5 text-primary animate-pulse" />
                  <h3 className="font-semibold text-lg">Vérification en cours...</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Nous vérifions ton paiement et préparons ton compte. Cela prend généralement quelques secondes.
                </p>
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Vérification automatique en cours...</span>
                </div>
              </div>
            )}

            {status === 'redirecting' && (
              <div className="bg-primary/10 rounded-xl p-6 space-y-3">
                <div className="flex items-center justify-center gap-3">
                  <Loader2 className="h-5 w-5 text-primary animate-spin" />
                  <h3 className="font-semibold text-lg">Connexion en cours...</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Tu vas être redirigé automatiquement vers ton espace personnel.
                </p>
              </div>
            )}

            {status === 'error' && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-6 space-y-3">
                <p className="text-sm text-destructive font-medium">
                  {errorMessage || 'Une erreur est survenue.'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Pas d'inquiétude ! Ton paiement a bien été enregistré. Connecte-toi avec l'email utilisé lors du paiement.
                </p>
              </div>
            )}

            {/* Google Login — always available as fallback */}
            <div className="space-y-3">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    Ou connexion rapide
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

            {/* Manual login button */}
            <div className="pt-2">
              <Button
                onClick={() => navigate('/auth/login')}
                variant="outline"
                size="lg"
                className="w-full"
              >
                Aller à la page de connexion
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
