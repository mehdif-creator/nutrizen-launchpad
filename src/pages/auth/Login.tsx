import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { signInWithGoogle } from '@/lib/auth/oauth';
import { getWebOrigin, isNativePlatform } from '@/lib/platform';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Mail, Chrome } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordMode, setPasswordMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Support redirect after login (e.g. from /credits)
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect');

  // Native (Capacitor): dedicated public screens — the web keeps its own links.
  const native = isNativePlatform();
  const plansHref = native ? '/native/plans' : '/#pricing';
  const homeHref = native ? '/native/welcome' : '/';

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error || !data.session) throw error || new Error('Missing session');
      setPassword('');
      const safeRedirect = redirectTo?.startsWith('/') && !redirectTo.startsWith('//') && !redirectTo.includes('\\') ? redirectTo : '/app';
      navigate(safeRedirect, { replace: true });
    } catch {
      toast({ title: 'Connexion impossible', description: 'Vérifiez votre email et votre mot de passe NutriZen.', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${getWebOrigin()}/auth/callback${redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`,
        },
      });

      if (error) throw error;

      toast({
        title: '✉️ Email envoyé !',
        description: 'Vérifie ta boîte mail pour te connecter.',
      });
    } catch (error: unknown) {
      // Generic error message to prevent user enumeration
      toast({
        title: 'Connexion',
        description: 'Une erreur est survenue lors de la connexion. Veuillez réessayer.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const { error } = await signInWithGoogle({
      callbackQuery: redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : '',
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    });

    if (error) {
      toast({
        title: 'Connexion',
        description:
          'Une erreur est survenue lors de la connexion avec Google. Veuillez réessayer.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-accent/10 to-primary/10 dark:from-accent/5 dark:to-primary/5 p-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl shadow-card p-5 sm:p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2 text-foreground">Connexion</h1>
            <p className="text-muted-foreground">Accède à ton espace NutriZen</p>
          </div>

          <div className="mb-6 p-4 bg-accent/10 dark:bg-accent/20 rounded-lg">
            <p className="text-sm text-center text-foreground">
              <strong>Nouveau membre ?</strong> Après votre inscription, vous recevrez un email avec
              un lien magique pour accéder à votre espace (vérifiez vos spam si vous ne le recevez
              pas).
            </p>
          </div>

          <div className="space-y-4">
            <form onSubmit={passwordMode ? handlePasswordLogin : handleMagicLink} className="space-y-4">
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

              {passwordMode && <div className="space-y-2">
                <Label htmlFor="login-password">Mot de passe NutriZen</Label>
                <Input id="login-password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required disabled={loading} />
                <Link to="/auth/reset" className="text-sm text-primary underline">Définir ou réinitialiser mon mot de passe</Link>
              </div>}
              <Button type="submit" className="w-full min-h-[52px]" disabled={loading}>
                <Mail className="mr-2 h-4 w-4" />
                {passwordMode ? (loading ? 'Connexion...' : 'Se connecter') : (loading ? 'Envoi...' : 'Recevoir un nouveau lien magique')}
              </Button>
            </form>
            <Button type="button" variant="outline" className="w-full" disabled={loading} onClick={() => { setPasswordMode(!passwordMode); setPassword(''); }}>
              {passwordMode ? 'Utiliser un lien par email' : 'Se connecter avec un mot de passe'}
            </Button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Ou continuer avec</span>
              </div>
            </div>

            <Button type="button" variant="outline" className="w-full" onClick={handleGoogleLogin}>
              <Chrome className="mr-2 h-4 w-4" />
              Google
            </Button>

            <div className="text-center text-sm text-muted-foreground pt-4">
              Pas encore de compte ?{' '}
              <Link to={plansHref} className="text-primary hover:underline font-medium">
                Voir les formules
              </Link>
            </div>
          </div>
        </div>

        <div className="text-center mt-4">
          <Link to={homeHref} className="text-sm text-muted-foreground hover:text-foreground">
            ← Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
