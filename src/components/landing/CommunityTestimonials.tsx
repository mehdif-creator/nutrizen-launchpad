import { Star } from 'lucide-react';
import { Card } from '@/components/ui/card';

const testimonials = [
  {
    name: 'Marie D.',
    role: 'Maman de 2 enfants',
    quote: "J'ai arrêté de stresser pour les repas. Je gagne 1h30 par jour et on mange enfin varié. Mes enfants adorent !",
    rating: 5,
    result: '+7h gagnées/semaine'
  },
  {
    name: 'Paul L.',
    role: 'Entrepreneur',
    quote: "J'avais peu de temps entre mes projets. Le swap en un clic est génial. Je ne reviendrai pas aux anciennes applis.",
    rating: 5,
    result: 'Objectif -5kg atteint'
  },
  {
    name: 'Sonia & Thomas',
    role: 'Jeunes parents',
    quote: "Entre le bébé, le travail et la maison, la planif des repas nous épuisait. MyNutriZen s'en occupe et c'est parfait.",
    rating: 5,
    result: '+10h/semaine en famille'
  },
  {
    name: 'Julie M.',
    role: 'Étudiante en médecine',
    quote: "Menus équilibrés, liste auto, zéro prise de tête. Exactement ce qu'il me fallait avec mes horaires impossibles.",
    rating: 5,
    result: 'Budget -30%'
  },
  {
    name: 'Marc V.',
    role: 'Coach sportif',
    quote: "Sceptique au début sur l'automatisation. Maintenant je ne peux plus m'en passer. Gain de temps énorme pour moi et mes clients.",
    rating: 5,
    result: '+12 clients orientés'
  },
  {
    name: 'Sophie R.',
    role: 'Maman de 4 enfants',
    quote: "Parfait pour notre famille nombreuse. Fini le \"qu'est-ce qu'on mange ce soir ?\". Les enfants participent au choix des menus.",
    rating: 5,
    result: 'Gaspillage divisé par 2'
  }
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
              <div className="flex items-center justify-between mb-3">
                <div className="flex gap-1">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-[#D64027] text-[#D64027]" />
                  ))}
                </div>
                <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded-full">
                  {testimonial.result}
                </span>
              </div>
              <p className="text-sm text-foreground mb-4 leading-relaxed">
                "{testimonial.quote}"
              </p>
              <div>
                <p className="text-sm font-semibold">{testimonial.name}</p>
                <p className="text-xs text-muted-foreground">{testimonial.role}</p>
              </div>
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
