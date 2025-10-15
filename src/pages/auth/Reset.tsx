import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Mail } from 'lucide-react';

export default function Reset() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/verify`,
      });

      if (error) throw error;

      setSent(true);
      toast({
        title: '✉️ Email envoyé',
        description: 'Si cet email existe, tu recevras un lien de réinitialisation.',
      });
    } catch (error: any) {
      // Generic message to prevent user enumeration
      setSent(true);
      toast({
        title: '✉️ Email envoyé',
        description: 'Si cet email existe, tu recevras un lien de réinitialisation.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-accent/10 to-primary/10 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-card p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Mot de passe oublié ?</h1>
            <p className="text-muted-foreground">
              Entre ton email pour réinitialiser ton mot de passe
            </p>
          </div>

          {!sent ? (
            <form onSubmit={handleReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="ton@email.fr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                <Mail className="mr-2 h-4 w-4" />
                {loading ? 'Envoi...' : 'Réinitialiser'}
              </Button>
            </form>
          ) : (
            <div className="text-center space-y-4">
              <p className="text-green-600">
                Un email a été envoyé à {email}
              </p>
              <Button onClick={() => setSent(false)} variant="outline">
                Renvoyer
              </Button>
            </div>
          )}

          <div className="text-center mt-6">
            <Link to="/auth/login" className="text-sm text-muted-foreground hover:text-foreground">
              Retour à la connexion
            </Link>
          </div>
        </div>

        <div className="text-center mt-4">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
