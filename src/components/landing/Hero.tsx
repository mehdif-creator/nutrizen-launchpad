import { Button } from "@/components/ui/button";
import { Star, Check, Clock, ShoppingBag, Heart } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface HeroProps {
  onCtaClick: () => void;
  onExampleClick: () => void;
}

export const Hero = ({ onCtaClick, onExampleClick }: HeroProps) => {
  const { t } = useLanguage();

  const scrollToQuiz = () => {
    const element = document.getElementById('quiz-profil');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };
  
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-background via-secondary/30 to-background">
      <div className="container py-16 md:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Content */}
          <div className="space-y-8 animate-fade-in">
            {/* Social proof */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 rounded-full text-sm">
              <span className="text-accent font-semibold">+2 000 familles</span>
              <span className="text-muted-foreground">ont retrouvé la sérénité des repas</span>
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                Fini de te demander <br className="hidden sm:block" />
                <span className="text-primary">"On mange quoi ce soir?"</span>
              </h1>
              <p className="text-xl text-muted-foreground font-medium">
                Ton menu de la semaine personnalisé en 30 secondes. Adapté à tes enfants, ton temps, et ton budget.
              </p>
              <div className="space-y-3 text-lg pt-2">
                <p className="flex items-start gap-3">
                  <Heart className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                  <span>
                    <strong>Un menu qui plaît à toute la famille</strong> — fini les "j'aime pas ça"
                  </span>
                </p>
                <p className="flex items-start gap-3">
                  <ShoppingBag className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                  <span>
                    <strong>Ta liste de courses générée</strong> — courses en 20 min chrono
                  </span>
                </p>
                <p className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                  <span>
                    <strong>Des recettes de 15–30 min</strong> — réalistes, pas des recettes de magazine
                  </span>
                </p>
              </div>
            </div>

            {/* CTAs */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={onCtaClick}
                  size="lg"
                  className="w-full sm:w-auto bg-gradient-to-r from-primary to-accent text-white hover:scale-[1.02] active:scale-[0.99] shadow-glow transition-tech text-base md:text-lg px-6 md:px-8 py-4"
                >
                  Créer mon menu gratuit
                </Button>
                <Button
                  onClick={scrollToQuiz}
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto text-base md:text-lg px-6 md:px-8 py-4"
                >
                  Découvrir mon Profil Repas
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                <strong>Compte gratuit à vie</strong> — Sans carte bancaire, en 30 secondes
              </p>
            </div>

            {/* Trust Row */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="w-4 h-4 fill-accent text-accent" />
                  ))}
                </div>
                <span className="font-medium">4.8/5</span>
                <span className="text-muted-foreground">sur 200+ avis</span>
              </div>

              <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-4 text-xs md:text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>Gratuit à vie, sans engagement</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>Recettes validées par diététicienne</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>+500 recettes françaises</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Hero Image */}
          <div className="relative animate-slide-up">
            <div className="aspect-square rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center overflow-hidden">
              <img
                src="/img/hero-default.png"
                alt="Maman sereine qui cuisine avec ses enfants"
                className="w-full h-full object-cover rounded-2xl"
              />
            </div>
            {/* Floating elements */}
            <div className="absolute -top-4 -right-4 bg-card rounded-2xl shadow-card p-4 animate-slide-up-delay border">
              <div className="text-2xl font-bold text-primary">30s</div>
              <div className="text-xs text-muted-foreground">Menu personnalisé</div>
            </div>
            <div className="absolute -bottom-4 -left-4 bg-card rounded-2xl shadow-card p-4 animate-slide-up-delay border">
              <div className="text-2xl font-bold text-accent">5h</div>
              <div className="text-xs text-muted-foreground">Économisées/semaine</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
