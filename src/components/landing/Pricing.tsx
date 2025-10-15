import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

interface PricingProps {
  onCtaClick: () => void;
  pricingNote?: string;
}

export const Pricing = ({ onCtaClick, pricingNote }: PricingProps) => {
  const [annual, setAnnual] = useState(false);

  const plans = [
    {
      name: 'Essentiel',
      price: annual ? 12.49 : 14.99,
      originalPrice: annual ? 14.99 : null,
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
      price: annual ? 20.83 : 24.99,
      originalPrice: annual ? 24.99 : null,
      meals: '60 repas / mois',
      mealsPerDay: '≈ 2 repas/jour + 10 swaps',
      badge: 'Le plus choisi',
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
      price: annual ? 33.33 : 39.99,
      originalPrice: annual ? 39.99 : null,
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

  return (
    <section id="tarifs" className="py-16 bg-gradient-to-b from-background to-secondary/20">
      <div className="container">
        <div className="text-center mb-12 animate-fade-in">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Des tarifs simples et transparents
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
            Choisis le plan qui correspond à tes besoins. Toujours annulable en 3 clics.
          </p>

          {/* Toggle Annual/Monthly */}
          <div className="inline-flex items-center gap-4 p-1 bg-muted rounded-full">
            <button
              onClick={() => setAnnual(false)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-tech ${
                !annual ? 'bg-background shadow-sm' : 'text-muted-foreground'
              }`}
            >
              Mensuel
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-tech ${
                annual ? 'bg-background shadow-sm' : 'text-muted-foreground'
              }`}
            >
              Annuel
              <span className="ml-2 text-xs text-success">-2 mois</span>
            </button>
          </div>
        </div>

        {/* Trial Banner */}
        <div className="mb-8 p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg border text-center">
          <p className="text-sm font-medium">
            🔥 <strong>1ère semaine gratuite</strong> — aucune CB requise
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

              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold">{plan.price}€</span>
                    <span className="text-muted-foreground">/ mois</span>
                  </div>
                  {plan.originalPrice && (
                    <p className="text-sm text-muted-foreground line-through">
                      {plan.originalPrice}€/mois
                    </p>
                  )}
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
                  onClick={onCtaClick}
                  className={`w-full hover:scale-[1.02] active:scale-[0.99] transition-tech ${
                    plan.popular
                      ? 'bg-gradient-to-r from-primary to-accent text-white shadow-glow'
                      : ''
                  }`}
                  variant={plan.popular ? 'default' : 'outline'}
                >
                  {plan.cta}
                </Button>
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-12 space-y-8">
          <div className="text-center text-sm text-muted-foreground">
            <p>✅ Garantie "temps gagné" 30 jours • Annulable en 3 clics • Support réactif</p>
          </div>

          {/* Économies vs Uber Eats */}
          <Card className="max-w-2xl mx-auto p-6 bg-background border-border shadow-card">
            <h3 className="font-bold mb-4 text-center">💰 Économies vs. Uber Eats / resto</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <div className="text-sm text-muted-foreground mb-2">Sans NutriZen</div>
                <div className="text-2xl font-bold text-error">~400€/mois</div>
                <div className="text-xs text-muted-foreground">(3× Uber Eats/sem. + restos)</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-2">Avec NutriZen Équilibre</div>
                <div className="text-2xl font-bold text-success">~200€/mois</div>
                <div className="text-xs text-muted-foreground">(courses + abonnement)</div>
              </div>
            </div>
            <div className="text-center mt-4 pt-4 border-t border-border">
              <div className="text-sm">
                <span className="font-bold text-success">Économie : ~200€/mois</span> (2 400€/an)
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
};
