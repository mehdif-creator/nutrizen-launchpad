import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CheckCircle, Mail, Loader2 } from 'lucide-react';

export default function PostCheckout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(10);
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // Countdown timer
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
  }, [navigate]);

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

            {/* Instructions */}
            <div className="bg-accent/10 rounded-xl p-6 space-y-4">
              <div className="flex items-start gap-4">
                <Mail className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                <div className="text-left space-y-2">
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
                    <li>Contacte-nous si tu ne reçois rien après 5 minutes</li>
                  </ul>
                </div>
              </div>
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
