import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Mail, Chrome, Apple } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/verify`,
        },
      });

      if (error) throw error;

      toast({
        title: '✉️ Email envoyé !',
        description: 'Vérifie ta boîte mail pour te connecter.',
      });
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/verify`,
      },
    });

    if (error) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-accent/10 to-primary/10 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-card p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Connexion</h1>
            <p className="text-muted-foreground">
              Accède à ton espace NutriZen
            </p>
          </div>

          <div className="space-y-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleGoogleLogin}
            >
              <Chrome className="mr-2 h-5 w-5" />
              Continuer avec Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-muted-foreground">
                  ou par email
                </span>
              </div>
            </div>

            <form onSubmit={handleMagicLink} className="space-y-4">
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
                {loading ? 'Envoi...' : 'Recevoir un lien magique'}
              </Button>
            </form>

            <div className="text-center text-sm text-muted-foreground">
              Pas encore de compte ?{' '}
              <Link to="/auth/signup" className="text-primary hover:underline">
                Créer un compte
              </Link>
            </div>

            <div className="text-center">
              <Link
                to="/auth/reset"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Mot de passe oublié ?
              </Link>
            </div>
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
