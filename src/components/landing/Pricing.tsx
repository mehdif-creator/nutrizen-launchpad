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
      credits: '≈30 crédits/mois',
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
      credits: '≈60 crédits + 10 swaps',
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
      credits: '≈120 crédits + swaps ∞',
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
                  <div className="px-4 py-1 bg-gradient-to-r from-primary to-accent text-white text-xs font-bold rounded-full">
                    RECOMMANDÉ
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
                  <p className="text-sm text-muted-foreground mt-1">{plan.credits}</p>
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
                  className={`w-full ${
                    plan.popular
                      ? 'bg-gradient-to-r from-primary to-accent text-white glow-primary'
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

        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>Garantie "temps gagné" 30 jours • Annulable en 3 clics • Support réactif</p>
        </div>
      </div>
    </section>
  );
};
