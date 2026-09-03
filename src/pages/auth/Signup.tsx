import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Shield, CheckCircle, Mail } from 'lucide-react';
import { trackSignup as trackPinterestSignup } from '@/lib/pinterestPixel';
import { trackCompleteRegistration } from '@/lib/analytics';

import {
  PLANS,
  getTotalPrice,
  getEffectiveMonthlyPrice,
  formatEUR,
  type BillingInterval,
  type PlanTier,
} from '@/config/pricing';

const PAID_PLAN_KEYS = ['starter', 'premium', 'starter_yearly', 'premium_yearly'] as const;

function parsePlanKey(raw: string): { tier: PlanTier; interval: BillingInterval } | null {
  if (raw === 'starter') return { tier: 'starter', interval: 'month' };
  if (raw === 'premium') return { tier: 'premium', interval: 'month' };
  if (raw === 'starter_yearly') return { tier: 'starter', interval: 'year' };
  if (raw === 'premium_yearly') return { tier: 'premium', interval: 'year' };
  return null;
}

function describePlan(raw: string): { label: string; price: string } | null {
  const parsed = parsePlanKey(raw);
  if (!parsed) return null;
  const { tier, interval } = parsed;
  const name = `Plan ${PLANS[tier].name}`;
  if (interval === 'month') {
    return { label: `${name} mensuel`, price: `${formatEUR(PLANS[tier].monthlyPrice)}/mois` };
  }
  const total = getTotalPrice(tier, 'year');
  const effective = getEffectiveMonthlyPrice(tier, 'year');
  return {
    label: `${name} annuel`,
    price: `${formatEUR(total)}/an · soit ${formatEUR(effective)}/mois`,
  };
}

export default function Signup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const plan = searchParams.get('plan') ?? 'starter';
  const isPaid = (PAID_PLAN_KEYS as readonly string[]).includes(plan);
  const planInfo = isPaid ? describePlan(plan) : null;

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState('');

  const validateEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

  const [paymentError, setPaymentError] = useState<string | null>(null);

  const handlePaidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    setPaymentError(null);
    if (!validateEmail(email)) {
      setEmailError('Adresse email invalide');
      return;
    }
    setLoading(true);

    const timeoutId = setTimeout(() => {
      setLoading(false);
      setPaymentError('La requête a pris trop de temps. Vérifie ta connexion et réessaie.');
    }, 15_000);

    try {
      // Propagate referral/affiliate codes from localStorage/cookie to checkout
      const storedRefCode = localStorage.getItem('nutrizen_referral_code') || '';
      const affCookieMatch = document.cookie.match(/(^| )nz_ref=([^;]+)/);
      const storedAffCode = affCookieMatch ? decodeURIComponent(affCookieMatch[2]) : '';

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          plan,
          email: email.trim(),
          turnstile_token: '',
          referral_code: storedRefCode,
          affiliate_code: storedAffCode,
        },
      });

      clearTimeout(timeoutId);

      if (error || !data?.url) {
        const errorMessage =
          data?.error?.message ||
          error?.message ||
          'Une erreur est survenue. Réessaie ou contacte le support.';
        throw new Error(errorMessage);
      }

      // Sync to Brevo silently before redirect — NOT a customer yet.
      // Checkout only started: tag as lead (list 2). The Stripe webhook moves
      // the contact to the paying list (8) once the payment is confirmed.
      try {
        await supabase.functions.invoke('brevo-add-contact', {
          body: {
            email: email.trim(),
            listIds: [2],
            attributes: {
              PRENOM: '',
              PLAN: 'lead',
              SOURCE: 'checkout_started',
              CHECKOUT_PLAN: plan,
            },
          },
        });
      } catch (brevoErr) {
        console.warn('[Brevo] checkout lead sync failed:', brevoErr);
      }

      // Redirect to Stripe — do NOT reset loading (page is navigating away)
      trackPinterestSignup({ plan });
      trackCompleteRegistration({ plan, flow: 'paid' });
      window.location.href = data.url;
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error('Payment error:', err);
      const msg = err?.message || 'Une erreur est survenue. Réessaie ou contacte le support.';
      setPaymentError(msg);
      setLoading(false);
    }
  };

  const handleFreeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    if (!validateEmail(email)) {
      setEmailError('Adresse email invalide');
      return;
    }
    setLoading(true);
    try {
      const trimmedEmail = email.trim();
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmedEmail,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) {
        toast({
          variant: 'destructive',
          title: 'Erreur',
          description: 'Une erreur est survenue. Réessaie.',
        });
        return;
      }

      // Sync to Brevo silently — free account → list 2
      try {
        await supabase.functions.invoke('brevo-add-contact', {
          body: {
            email: trimmedEmail,
            listIds: [2],
            attributes: { PRENOM: '', PLAN: 'free', SOURCE: 'app_signup' },
          },
        });
      } catch (brevoErr) {
        console.warn('[Brevo] signup sync failed:', brevoErr);
      }

      setEmailSent(true);
      trackPinterestSignup({ plan: 'free' });
      trackCompleteRegistration({ plan: 'free', flow: 'magic_link' });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Une erreur est survenue. Réessaie.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-accent/10 to-primary/10 p-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl shadow-card p-8 border">
          {/* ── PAID FLOW ── */}
          {isPaid && (
            <>
              <div className="text-center mb-8">
                <div className="inline-block px-4 py-1.5 bg-accent/10 rounded-full mb-4">
                  <span className="text-sm font-semibold text-accent">
                    {planInfo?.label} — {planInfo?.price}
                  </span>
                </div>
                <h1 className="text-2xl font-bold mb-1">Finalise ton inscription</h1>
                <p className="text-muted-foreground text-sm">
                  Tu seras redirigé vers Stripe pour le paiement sécurisé.
                </p>
              </div>

              <form onSubmit={handlePaidSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="email">Ton adresse email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="toi@exemple.fr"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailError('');
                    }}
                    className="mt-1.5"
                    autoFocus
                  />
                  {emailError && <p className="text-sm text-destructive mt-1">{emailError}</p>}
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {loading ? 'Redirection vers Stripe...' : 'Continuer vers le paiement →'}
                </Button>

                {paymentError && (
                  <p className="text-sm text-destructive text-center mt-2">{paymentError}</p>
                )}
              </form>

              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mt-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Shield className="w-3 h-3" /> Paiement sécurisé Stripe
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Annulable à tout moment
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Accès immédiat après paiement
                </span>
              </div>
            </>
          )}

          {/* ── FREE FLOW ── */}
          {!isPaid && !emailSent && (
            <>
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold mb-1">Commencer gratuitement</h1>
                <p className="text-muted-foreground text-sm">
                  14 crédits offerts dès l'inscription
                </p>
              </div>

              {/* Google */}
              <Button variant="outline" className="w-full mb-4" size="lg" onClick={handleGoogle}>
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Continuer avec Google
              </Button>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 border-t" />
                <span className="text-xs text-muted-foreground">ou</span>
                <div className="flex-1 border-t" />
              </div>

              {/* Email magic link */}
              <form onSubmit={handleFreeSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="email">Ton adresse email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="toi@exemple.fr"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailError('');
                    }}
                    className="mt-1.5"
                  />
                  {emailError && <p className="text-sm text-destructive mt-1">{emailError}</p>}
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Recevoir mon lien d'accès ✉️
                </Button>
              </form>
            </>
          )}

          {/* ── EMAIL SENT STATE ── */}
          {!isPaid && emailSent && (
            <div className="text-center space-y-4 py-4">
              <Mail className="w-12 h-12 text-primary mx-auto" />
              <h2 className="text-xl font-bold">✉️ Email envoyé !</h2>
              <p className="text-muted-foreground text-sm">
                Vérifie ta boîte mail (et tes spams) pour accéder à ton compte.
              </p>
              <Button variant="outline" onClick={() => navigate('/')}>
                Retour à l'accueil
              </Button>
            </div>
          )}

          {/* Login link */}
          {!(emailSent && !isPaid) && (
            <div className="text-center text-sm text-muted-foreground mt-6">
              Déjà un compte ?{' '}
              <a href="/auth/login" className="text-primary hover:underline">
                Se connecter
              </a>
            </div>
          )}
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
