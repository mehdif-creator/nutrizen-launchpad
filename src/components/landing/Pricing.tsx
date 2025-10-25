import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';

interface PricingProps {
  onCtaClick: () => void;
  pricingNote?: string;
}

export const Pricing = ({ onCtaClick, pricingNote }: PricingProps) => {
  const [annual, setAnnual] = useState(false);
  const { user, session } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [email, setEmail] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<{ priceId: string; planName: string } | null>(null);
  const { t } = useLanguage();

  const plans = [
    {
      name: 'Essentiel',
      price: annual ? 12.49 : 14.99,
      priceId: 'price_1SIWDPEl2hJeGlFp14plp0D5',
      originalPrice: null,
      meals: '30 repas / mois',
      mealsPerDay: '≈ 1 repas/jour',
      features: [
        'Génération de menus hebdo',
        'Liste de courses auto',
        '3 swaps par mois',
        'Recettes 20–30 min',
        'Support par email'
      ],
      cta: 'Commencer gratuitement',
      popular: false
    },
    {
      name: 'Équilibre',
      price: annual ? 16.66 : 19.99,
      priceId: 'price_1SIWFyEl2hJeGlFp8pQyEMQC',
      originalPrice: null,
      meals: '60 repas / mois',
      mealsPerDay: '≈ 2 repas/jour + 10 swaps',
      badge: 'Meilleur choix',
      popularLabel: '⭐ Le plus populaire (82 % des utilisateurs)',
      features: [
        'Tout Essentiel',
        '10 swaps par mois',
        'Batch-cooking guide',
        'Astuce quotidienne',
        'Support prioritaire',
        'Accès anticipé features'
      ],
      cta: 'Commencer gratuitement',
      popular: true
    },
    {
      name: 'Premium',
      price: annual ? 24.99 : 29.99,
      priceId: 'price_1SIWGdEl2hJeGlFp1e1pekfL',
      originalPrice: null,
      meals: '120 repas / mois',
      mealsPerDay: 'Tous tes repas + swaps ∞',
      features: [
        'Tout Équilibre',
        'Swaps illimités',
        'Coaching mensuel (15 min)',
        'Recettes exclusives',
        'Support dédié',
        'API access (bêta)'
      ],
      cta: 'Commencer gratuitement',
      popular: false
    }
  ];

  const handleSubscribe = async (priceId: string, planName: string) => {
    // If user is already logged in, proceed directly
    if (user && session) {
      await createCheckoutSession(priceId, user.email || '');
      return;
    }

    // Otherwise, ask for email first
    setSelectedPlan({ priceId, planName });
    setShowEmailDialog(true);
  };

  const createCheckoutSession = async (priceId: string, userEmail: string) => {
    setLoading(priceId);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId, email: userEmail },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url; // Redirect to Stripe checkout
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de créer la session de paiement',
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
      setShowEmailDialog(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan || !email) return;
    
    await createCheckoutSession(selectedPlan.priceId, email);
  };

  return (
    <section id="tarifs" className="py-16 bg-gradient-to-b from-background to-secondary/20">
      <div className="container">
        <div className="text-center mb-12 animate-fade-in">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t('pricing.title')}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
            {t('pricing.subtitle')}
          </p>

          {/* Toggle Annual/Monthly */}
          <div className="inline-flex items-center gap-4 p-1 bg-muted rounded-full">
            <button
              onClick={() => setAnnual(false)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-tech ${
                !annual ? 'bg-background shadow-sm' : 'text-muted-foreground'
              }`}
            >
              {t('pricing.monthly')}
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-tech ${
                annual ? 'bg-background shadow-sm' : 'text-muted-foreground'
              }`}
            >
              {t('pricing.annual')}
              <span className="ml-2 text-xs text-success">{t('pricing.discount')}</span>
            </button>
          </div>
        </div>

        {/* Value Anchor */}
        <div className="mb-8 p-6 bg-gradient-to-br from-accent/10 to-primary/10 rounded-2xl border-2 border-accent/20 text-center">
          <div className="flex flex-col md:flex-row items-center justify-center gap-4">
            <div className="text-left">
              <p className="text-sm text-muted-foreground mb-1">Valeur réelle estimée :</p>
              <p className="text-3xl font-bold line-through text-muted-foreground">200 €/mois</p>
            </div>
            <div className="text-4xl font-bold text-accent">→</div>
            <div className="text-left">
              <p className="text-sm text-accent font-medium mb-1">Ton tarif aujourd'hui :</p>
              <p className="text-4xl font-bold text-foreground">19,99 €<span className="text-lg">/mois</span></p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm">
            <span className="flex items-center gap-1">
              <Check className="w-4 h-4 text-accent" />
              <span>50+ recettes exclusives</span>
            </span>
            <span className="flex items-center gap-1">
              <Check className="w-4 h-4 text-accent" />
              <span>Support prioritaire</span>
            </span>
            <span className="flex items-center gap-1">
              <Check className="w-4 h-4 text-accent" />
              <span>Garantie 30 jours</span>
            </span>
          </div>
        </div>

        {/* Trial Banner */}
        <div className="mb-8 p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg border text-center">
          <p className="text-sm font-medium">
            {t('pricing.trial')}
          </p>
        </div>

        {pricingNote && (
          <div className="mb-8 p-4 bg-accent/10 rounded-lg text-center">
            <p className="text-sm text-accent-foreground">💡 {pricingNote}</p>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan, index) => (
            <Card
              key={plan.name}
              className={`p-6 relative ${
                plan.popular ? 'border-primary shadow-lg scale-105' : ''
              } animate-slide-up`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <div className="px-4 py-1 bg-gradient-to-r from-primary to-accent text-white text-xs font-bold rounded-full shadow-glow">
                    {plan.badge || 'RECOMMANDÉ'}
                  </div>
                </div>
              )}
              
              {plan.popularLabel && (
                <div className="mb-4 text-center">
                  <span className="text-sm font-medium text-primary">{plan.popularLabel}</span>
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold">{plan.price}€</span>
                    <span className="text-muted-foreground">/ mois</span>
                  </div>
                  <p className="text-sm font-medium text-primary mt-2">{plan.meals}</p>
                  <p className="text-xs text-muted-foreground">{plan.mealsPerDay}</p>
                </div>

                <div className="space-y-3">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={() => handleSubscribe(plan.priceId, plan.name)}
                  disabled={loading === plan.priceId}
                  className={`w-full hover:scale-[1.02] active:scale-[0.99] transition-tech ${
                    plan.popular
                      ? 'bg-gradient-to-r from-primary to-accent text-white shadow-glow'
                      : ''
                  }`}
                  variant={plan.popular ? 'default' : 'outline'}
                >
                  {loading === plan.priceId ? 'Chargement...' : plan.cta}
                </Button>
                
                <p className="text-xs text-center text-muted-foreground mt-3">
                  Essai gratuit 7 jours — sans engagement
                </p>
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center text-sm text-muted-foreground">
          <p>{t('pricing.note')}</p>
        </div>
      </div>

      {/* Email Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Commence ton essai gratuit</DialogTitle>
            <DialogDescription>
              Entre ton email pour démarrer ton essai de 7 jours gratuit
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Adresse email</Label>
              <Input
                id="email"
                type="email"
                placeholder="ton@email.fr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading !== null}>
              {loading ? 'Chargement...' : 'Continuer vers le paiement'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
};
