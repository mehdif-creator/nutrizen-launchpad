import { Card } from '@/components/ui/card';
import { Star, ArrowLeft, ArrowRight } from 'lucide-react';
import { PersonaConfig } from '@/config/personas';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface TestimonialsProps {
  config: PersonaConfig;
}

export const Testimonials = ({ config }: TestimonialsProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const allTestimonials = [
    ...config.testimonials,
    {
      quote: "J'ai gagné 4h par semaine. Plus de stress 'qu'est-ce qu'on mange ce soir ?'",
      name: "Marc T., 41 ans"
    },
    {
      quote: "Les recettes sont vraiment rapides, et la liste de courses automatique change la vie.",
      name: "Laura B., 27 ans"
    }
  ];

  const next = () => {
    setCurrentIndex((prev) => (prev + 1) % allTestimonials.length);
  };

  const prev = () => {
    setCurrentIndex((prev) => (prev - 1 + allTestimonials.length) % allTestimonials.length);
  };

  return (
    <section className="py-16 bg-muted/30">
      <div className="container">
        <div className="text-center mb-12 animate-fade-in">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ils ont repris le contrôle de leur assiette
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Rejoins plus de 2 400 personnes qui gagnent du temps chaque semaine
          </p>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="p-6 text-center bg-background border-border shadow-card">
            <div className="text-4xl font-bold text-primary mb-2">4,8/5</div>
            <div className="flex justify-center mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} className="w-4 h-4 fill-accent text-accent" />
              ))}
            </div>
            <div className="text-sm text-muted-foreground">Note moyenne</div>
          </Card>
          <Card className="p-6 text-center bg-background border-border shadow-card">
            <div className="text-4xl font-bold text-primary mb-2">3,5h</div>
            <div className="text-sm text-muted-foreground mb-2">gagnées / semaine</div>
            <div className="text-xs text-muted-foreground">(vs. planning manuel)</div>
          </Card>
          <Card className="p-6 text-center bg-background border-border shadow-card">
            <div className="text-4xl font-bold text-primary mb-2">87%</div>
            <div className="text-sm text-muted-foreground mb-2">restent après l'essai</div>
            <div className="text-xs text-muted-foreground">(satisfaction)</div>
          </Card>
        </div>

        {/* Carousel */}
        <div className="relative max-w-3xl mx-auto">
          <Card className="p-8 bg-background border-border shadow-card animate-fade-in">
            <div className="flex mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} className="w-5 h-5 fill-accent text-accent" />
              ))}
            </div>
            <p className="text-lg mb-4 leading-relaxed">
              "{allTestimonials[currentIndex].quote}"
            </p>
            <p className="font-medium text-muted-foreground">
              — {allTestimonials[currentIndex].name}
            </p>
          </Card>

          {/* Navigation */}
          <div className="flex justify-center gap-4 mt-6">
            <Button
              variant="outline"
              size="icon"
              onClick={prev}
              className="hover:scale-105 transition-tech"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2">
              {allTestimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-2 h-2 rounded-full transition-tech ${
                    index === currentIndex ? 'bg-primary w-6' : 'bg-muted-foreground/30'
                  }`}
                />
              ))}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={next}
              className="hover:scale-105 transition-tech"
            >
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Avant/Après */}
        {config.beforeAfter && (
          <div className="mt-12 max-w-2xl mx-auto">
            <Card className="p-6 bg-background border-border shadow-card">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="text-center">
                  <div className="text-sm text-muted-foreground mb-2">Avant</div>
                  <div className="text-xl font-bold text-error">{config.beforeAfter.before}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-muted-foreground mb-2">Après</div>
                  <div className="text-xl font-bold text-success">{config.beforeAfter.after}</div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </section>
  );
};
