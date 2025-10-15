import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Chrome, Mail } from 'lucide-react';
import { emitWebhookEvent } from '@/lib/webhooks';
import { z } from 'zod';

const signupSchema = z.object({
  email: z.string().email('Email invalide').max(255, 'Email trop long'),
  fullName: z.string()
    .trim()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(100, 'Le nom doit contenir au plus 100 caractères')
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'Le nom contient des caractères invalides'),
});

export default function Signup() {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!consent) {
      toast({
        title: 'Consentement requis',
        description: 'Tu dois accepter les CGV pour continuer.',
        variant: 'destructive',
      });
      return;
    }

    // Validate input
    const validation = signupSchema.safeParse({ email, fullName });
    if (!validation.success) {
      toast({
        title: 'Erreur de validation',
        description: validation.error.errors[0].message,
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: validation.data.email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/verify`,
          data: {
            full_name: validation.data.fullName,
          },
        },
      });

      if (error) throw error;

      // Emit webhook event
      await emitWebhookEvent({
        event: 'user.created',
        email: validation.data.email,
        full_name: validation.data.fullName,
        ts: Date.now(),
      });

      toast({
        title: '🎉 Presque terminé !',
        description: 'Vérifie ta boîte mail pour activer ton compte.',
      });
    } catch (error: any) {
      // Generic error message to prevent user enumeration
      toast({
        title: 'Inscription',
        description: 'Un email de vérification a été envoyé si le compte n\'existe pas déjà.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    if (!consent) {
      toast({
        title: 'Consentement requis',
        description: 'Tu dois accepter les CGV pour continuer.',
        variant: 'destructive',
      });
      return;
    }

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
            <h1 className="text-3xl font-bold mb-2">Créer un compte</h1>
            <p className="text-muted-foreground">
              Commence ta semaine gratuite
            </p>
          </div>

          <div className="space-y-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleGoogleSignup}
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

            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nom complet</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Jean Dupont"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

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

              <div className="flex items-start space-x-2">
                <Checkbox
                  id="consent"
                  checked={consent}
                  onCheckedChange={(checked) => setConsent(checked as boolean)}
                />
                <label
                  htmlFor="consent"
                  className="text-sm text-muted-foreground leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  J'accepte les{' '}
                  <Link to="/legal/cgv" className="text-primary hover:underline">
                    CGV
                  </Link>{' '}
                  et la{' '}
                  <Link to="/legal/confidentialite" className="text-primary hover:underline">
                    politique de confidentialité
                  </Link>
                </label>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                <Mail className="mr-2 h-4 w-4" />
                {loading ? 'Envoi...' : 'Créer mon compte gratuit'}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                7 jours gratuits · Aucune carte bancaire requise
              </p>
            </form>

            <div className="text-center text-sm text-muted-foreground">
              Déjà un compte ?{' '}
              <Link to="/auth/login" className="text-primary hover:underline">
                Se connecter
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
