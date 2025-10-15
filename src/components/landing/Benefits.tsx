import { Clock, Coins, Brain } from 'lucide-react';
import { Card } from '@/components/ui/card';

export const Benefits = () => {
  const benefits = [
    {
      icon: Clock,
      title: 'Gagne 3h par semaine',
      description: 'Plus besoin de réfléchir à quoi manger.',
    },
    {
      icon: Coins,
      title: 'Économise jusqu\'à 30 %',
      description: 'Menus optimisés pour ton budget.',
    },
    {
      icon: Brain,
      title: 'Zéro charge mentale',
      description: 'Tes repas, courses et recettes prêts en 1 clic.',
    },
  ];

  return (
    <section id="avantages" className="py-16 bg-muted/30">
      <div className="container">
        <div className="text-center mb-12 animate-fade-in">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Pourquoi choisir NutriZen ?
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {benefits.map((benefit, index) => (
            <Card
              key={benefit.title}
              className="p-8 text-center bg-background border-border shadow-card hover:shadow-lg transition-tech animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary/10 to-accent/10 mb-6">
                <benefit.icon className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">{benefit.title}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {benefit.description}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
