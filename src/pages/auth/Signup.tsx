import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function Signup() {
  const navigate = useNavigate();

  const handleSignup = () => {
    // Redirect to home page with pricing section
    window.location.href = '/#tarifs';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-accent/10 to-primary/10 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-card p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Commencer avec NutriZen</h1>
            <p className="text-muted-foreground">
              Choisis ta formule pour créer ton compte
            </p>
          </div>

          <div className="space-y-6">
            <div className="text-center space-y-2 mb-6 p-4 bg-accent/10 rounded-lg">
              <p className="text-sm">
                Pour garantir la qualité de notre service, la création de compte se fait uniquement via Stripe.
              </p>
              <p className="text-sm font-semibold text-primary">
                🎁 7 jours d'essai gratuit · Aucune carte bancaire requise
              </p>
            </div>

            <Button
              onClick={handleSignup}
              className="w-full"
              size="lg"
            >
              Voir les formules
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              Déjà un compte ?{' '}
              <a href="/auth/login" className="text-primary hover:underline">
                Se connecter
              </a>
            </div>
          </div>
        </div>

        <div className="text-center mt-4">
          <a href="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Retour à l'accueil
          </a>
        </div>
      </div>
    </div>
  );
}
