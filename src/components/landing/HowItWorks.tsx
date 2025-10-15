import { Card } from '@/components/ui/card';
import { ClipboardList, Sparkles, ShoppingCart, ChefHat } from 'lucide-react';

export const HowItWorks = () => {
  const steps = [
    {
      icon: ClipboardList,
      number: '1',
      title: 'Onboarding 60–90 s',
      description: 'Objectif, budget, temps disponible, allergies'
    },
    {
      icon: Sparkles,
      number: '2',
      title: 'Génération instantanée',
      description: 'Ton plan de la semaine adapté à tes besoins'
    },
    {
      icon: ShoppingCart,
      number: '3',
      title: 'Liste de courses',
      description: 'Consolidée et optimisée automatiquement'
    },
    {
      icon: ChefHat,
      number: '4',
      title: 'Recettes guidées',
      description: 'Étapes claires, minuteur intégré, 20–30 min max'
    }
  ];

  return (
    <section id="comment" className="py-16 bg-gradient-to-b from-secondary/20 to-background">
      <div className="container">
        <div className="text-center mb-12 animate-fade-in">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Comment ça marche ?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            4 étapes simples pour transformer ton alimentation
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <Card
                key={step.number}
                className="p-6 relative overflow-hidden animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="absolute top-4 right-4 text-6xl font-bold text-primary/5">
                  {step.number}
                </div>
                <div className="relative space-y-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};
