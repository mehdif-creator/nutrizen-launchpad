import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { emitWebhookEvent } from '@/lib/webhooks';

export default function Verify() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      // Emit trial started event
      emitWebhookEvent({
        event: 'trial.started',
        user_id: user.id,
        email: user.email,
        ts: Date.now(),
      });

      // Redirect to app after short delay
      setTimeout(() => {
        navigate('/app');
      }, 2000);
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Lien invalide ou expiré</h1>
          <p className="text-muted-foreground">
            Le lien de vérification n'est plus valide.
          </p>
          <Button onClick={() => navigate('/auth/login')}>
            Retour à la connexion
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
        <h1 className="text-2xl font-bold">Compte vérifié !</h1>
        <p className="text-muted-foreground">
          Redirection vers ton tableau de bord...
        </p>
      </div>
    </div>
  );
}
