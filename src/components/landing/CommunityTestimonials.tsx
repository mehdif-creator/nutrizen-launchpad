import { Star } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const testimonials = [
  {
    name: 'Marie, 34 ans, Lyon — Infirmière',
    quote: "Je passais 45 minutes chaque soir à chercher quoi cuisiner. En 3 semaines avec NutriZen, j'ai récupéré plus de 5 heures par semaine et notre budget courses a baissé de 25%.",
    rating: 5,
  },
  {
    name: 'Paul, 41 ans, Bordeaux — Entrepreneur',
    quote: "J'enchaînais les plats préparés faute de temps. Après 2 mois, j'ai perdu 4 kg sans régime — juste en mangeant des repas équilibrés générés automatiquement.",
    rating: 5,
  },
  {
    name: 'Sonia, 29 ans, Nantes — Jeune maman',
    quote: "Entre le bébé et le travail, la planification des repas était impossible. En 6 semaines, j'ai divisé notre gaspillage alimentaire par 2 et gagné 2 soirées libres.",
    rating: 5,
  },
  {
    name: 'Julie, 23 ans, Paris — Étudiante',
    quote: "Avec mes horaires impossibles, je sautais des repas. En 1 mois de NutriZen, budget courses réduit de 30% et je n'ai pas sauté un seul repas.",
    rating: 5,
  },
  {
    name: 'Marc, 38 ans, Marseille — Coach sportif',
    quote: "Sceptique au départ. Après 8 semaines, 12 de mes clients utilisent NutriZen. Le calcul automatique des macros leur fait gagner un temps énorme.",
    rating: 5,
  },
  {
    name: 'Sophie, 42 ans, Lille — Maman de 4 enfants',
    quote: "Fini le « qu'est-ce qu'on mange ce soir ? ». En 1 mois, les enfants participent au choix des menus et notre gaspillage a été divisé par 2.",
    rating: 5,
  },
];

export const CommunityTestimonials = () => {
  return (
    <section className="py-16 bg-secondary/30">
      <div className="container">
        <div className="text-center mb-12 animate-fade-in">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ce que nos utilisateurs constatent
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {testimonials.map((t, index) => (
            <Card
              key={t.name}
              className="p-6 border-border shadow-card hover:shadow-glow transition-shadow animate-slide-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <Badge className="bg-accent/15 text-accent border-accent/30 text-xs mb-4">
                Résultat concret
              </Badge>
              <div className="flex gap-1 mb-3">
                {[...Array(t.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-accent text-accent" />
                ))}
              </div>
              <p className="text-sm text-foreground mb-4 leading-relaxed">
                "{t.quote}"
              </p>
              <p className="text-xs text-muted-foreground">{t.name}</p>
            </Card>
          ))}
        </div>

        <Card className="max-w-md mx-auto p-6 border-border shadow-card text-center">
          <div className="flex items-center justify-center gap-2">
            <span className="text-4xl font-bold text-accent">4,8</span>
            <div className="flex flex-col items-start">
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-accent text-accent" />
                ))}
              </div>
              <span className="text-xs text-muted-foreground">(Basé sur 4 111 avis vérifiés)</span>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
};
