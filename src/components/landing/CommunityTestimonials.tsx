import { Star } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Testimonial {
  name: string;
  quote: string;
  rating: number;
}

interface CommunityTestimonialsProps {
  testimonials?: Testimonial[];
}

const defaultTestimonials: Testimonial[] = [
  {
    name: 'Camille, 29 ans, Paris — Chargée de communication',
    quote: "Je rentrais du travail sans savoir quoi cuisiner et je finissais par commander. En 3 semaines avec NutriZen, j'ai réduit mes commandes de 4 à 1 par mois.",
    rating: 5,
  },
  {
    name: 'Julien, 41 ans, Strasbourg — Comptable',
    quote: "On jetait environ 30€ de nourriture par semaine sans s'en rendre compte. Depuis qu'on planifie avec NutriZen, notre budget courses a baissé de 180€/mois.",
    rating: 5,
  },
  {
    name: 'Amandine, 35 ans, Toulouse — Enseignante',
    quote: "J'avais toujours les mêmes 6 recettes en rotation. En 2 mois j'en ai découvert plus de 40 nouvelles que toute ma famille apprécie.",
    rating: 5,
  },
  {
    name: 'Thomas, 33 ans, Lyon — Développeur',
    quote: "Je passais 40 minutes par soir à chercher une idée de repas. En 6 semaines, j'ai récupéré plus de 4 heures par semaine pour mes projets perso.",
    rating: 5,
  },
  {
    name: 'Laura, 38 ans, Bordeaux — Infirmière',
    quote: "Avec mes horaires décalés, je mangeais n'importe quoi. Après 1 mois de menus NutriZen, j'ai perdu 3 kg sans aucun régime.",
    rating: 5,
  },
  {
    name: 'Nicolas, 45 ans, Rennes — Artisan',
    quote: "Ma femme et moi on se disputait chaque soir sur le repas. Depuis NutriZen, on valide le menu le dimanche en 5 minutes et c'est réglé.",
    rating: 5,
  },
];

export const CommunityTestimonials = ({ testimonials = defaultTestimonials }: CommunityTestimonialsProps) => {
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
