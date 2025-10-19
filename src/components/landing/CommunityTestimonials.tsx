import { Star } from 'lucide-react';
import { Card } from '@/components/ui/card';

const testimonials = [
  {
    name: 'Marie D.',
    quote: "Grâce à MyNutrizen j'ai arrêté de stresser, je gagne 1h30 par jour et je mange enfin varié.",
    rating: 5,
  },
  {
    name: 'Paul L.',
    quote: "J'avais peu de temps, j'ai été bluffé par le swap en un clic. Je ne reviendrai pas aux anciennes applis.",
    rating: 5,
  },
  {
    name: 'Sonia & Thomas',
    quote: "Enfant/mari/travail – la planif me saoulait. MyNutrizen s'en occupe.",
    rating: 5,
  },
  {
    name: 'Julie, 34 ans',
    quote: "Depuis que j'utilise NutriZen, je gagne 4 heures par semaine et j'arrête de commander !",
    rating: 5,
  },
  {
    name: 'Léo, 29 ans',
    quote: "Menus simples et rapides, c'est devenu mon réflexe du dimanche.",
    rating: 5,
  },
  {
    name: 'Emma, 37 ans',
    quote: "J'ai enfin arrêté de me casser la tête pour les repas de la semaine.",
    rating: 5,
  },
];

export const CommunityTestimonials = () => {
  return (
    <section className="py-16 bg-[#FFF8F2]">
      <div className="container">
        <div className="text-center mb-12 animate-fade-in">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-[#D64027]">
            Rejoignez une communauté de milliers d'utilisateurs comblés
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {testimonials.map((testimonial, index) => (
            <Card
              key={testimonial.name}
              className="p-6 bg-white border-none shadow-card hover:shadow-glow transition-shadow animate-slide-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex gap-1 mb-3">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-[#D64027] text-[#D64027]" />
                ))}
              </div>
              <p className="text-sm text-foreground mb-4 leading-relaxed">
                "{testimonial.quote}"
              </p>
              <p className="text-xs font-medium text-muted-foreground">
                — {testimonial.name}
              </p>
            </Card>
          ))}
        </div>

        <Card className="max-w-md mx-auto p-6 bg-white border-none shadow-card text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-4xl font-bold text-[#D64027]">4,8</span>
            <div className="flex flex-col items-start">
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-[#D64027] text-[#D64027]" />
                ))}
              </div>
              <span className="text-xs text-muted-foreground">4 111 avis</span>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
};
