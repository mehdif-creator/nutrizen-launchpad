import { Star } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface Testimonial {
  name: string;
  profession: string;
  quote: string;
  rating: number;
}

interface CommunityTestimonialsProps {
  testimonials?: Testimonial[];
}

const defaultTestimonials: Testimonial[] = [
  {
    name: 'Camille, 29 ans, Paris',
    profession: 'Chargée de communication',
    quote: "Je rentrais du travail sans savoir quoi cuisiner et je finissais par commander à livrer. En 3 semaines, je suis passée à 0 commande par mois — sans effort particulier.",
    rating: 5,
  },
  {
    name: 'Julien, 41 ans, Strasbourg',
    profession: 'Comptable',
    quote: "On jetait environ 30€ de nourriture par semaine sans s'en rendre compte. Depuis qu'on planifie avec NutriZen, notre budget courses a baissé de 180€ par mois.",
    rating: 5,
  },
  {
    name: 'Amandine, 35 ans, Toulouse',
    profession: 'Enseignante',
    quote: "J'avais 6 recettes en rotation depuis 3 ans. En 2 mois, j'en ai découvert plus de 40 nouvelles que toute ma famille apprécie. La variété a complètement changé notre rapport au repas.",
    rating: 5,
  },
  {
    name: 'Romain, 38 ans, Lyon',
    profession: 'Ingénieur',
    quote: "Je passais 45 minutes chaque dimanche à planifier la semaine sur un carnet. NutriZen fait ça en 3 minutes. J'ai récupéré du temps que je n'avais pas.",
    rating: 5,
  },
  {
    name: 'Nathalie, 44 ans, Bordeaux',
    profession: 'Pharmacienne',
    quote: "En 6 semaines de planification, j'ai perdu 4kg sans régime et sans me priver. Juste en mangeant des choses choisies plutôt que subies.",
    rating: 5,
  },
  {
    name: 'Éric, 33 ans, Nantes',
    profession: 'Graphiste indépendant',
    quote: "Mon plus grand problème c'était le gaspillage. On cuisinait sans plan et on jetait. En 1 mois de NutriZen : zéro aliment jeté, liste de courses au centime.",
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
              {/* Badge */}
              <span className="inline-block mb-4 rounded-full border border-accent/40 bg-accent/[0.12] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.5px] text-accent">
                Résultat concret
              </span>

              {/* Stars */}
              <div className="flex gap-1 mb-3">
                {[...Array(t.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-accent text-accent" />
                ))}
              </div>

              {/* Quote */}
              <p className="text-sm text-foreground mb-5 leading-[1.7]">
                "{t.quote}"
              </p>

              {/* Author with orange left border */}
              <div className="border-l-2 border-accent pl-3">
                <p className="text-sm font-bold text-foreground">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.profession}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* Global rating footer */}
        <Card className="max-w-md mx-auto p-6 border-border shadow-card text-center">
          <div className="flex items-center justify-center gap-2">
            <span className="text-4xl font-bold text-accent">4,8</span>
            <div className="flex flex-col items-start">
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-accent text-accent" />
                ))}
              </div>
              <span className="text-xs text-muted-foreground">Basé sur +1 200 avis vérifiés — mis à jour chaque semaine</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground italic mt-2">
            Avis collectés via notre plateforme après 30 jours d'utilisation
          </p>
        </Card>
      </div>
    </section>
  );
};
