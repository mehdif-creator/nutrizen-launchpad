import { Button } from "@/components/ui/button";
import { Star, Check, CreditCard } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface HeroProps {
  onCtaClick: () => void;
  onExampleClick: () => void;
}

export const Hero = ({ onCtaClick, onExampleClick }: HeroProps) => {
  const { t } = useLanguage();

  const scrollToCredits = () => {
    const element = document.getElementById('tarifs');
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
            {/* Preuve sociale immédiate */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 rounded-full text-sm">
              <span className="text-accent font-semibold">+2 000 familles</span>
              <span className="text-muted-foreground">mangent mieux avec NutriZen</span>
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                Menus adaptés à tes objectifs en 30 secondes
              </h1>
              <p className="text-xl text-muted-foreground font-medium">
                Fini le casse-tête des repas. NutriZen crée ton menu hebdomadaire personnalisé.
              </p>
              <div className="space-y-2 text-lg">
                <p className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                  <span>
                    <strong>Menu hebdo personnalisé</strong> — gratuit
                  </span>
                </p>
                <p className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                  <span>
                    <strong>Recettes + macros + liste de courses</strong> — inclus
                  </span>
                </p>
                <p className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                  <span>
                    <strong>Options avancées</strong> — via Crédits Zen (ScanRepas, InspiFrigo…)
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
                  Commencer gratuitement
                </Button>
                <Button
                  onClick={scrollToCredits}
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto text-base md:text-lg px-6 md:px-8 py-4"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Voir les Crédits Zen
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                <strong>Sans carte bancaire</strong> — Créer ton compte en 30 secondes
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
                  <span>Compte gratuit à vie</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>Paiement sécurisé Stripe</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>Recettes validées par diététicienne</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Hero Image */}
          <div className="relative animate-slide-up">
            <div className="aspect-square rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center overflow-hidden">
              <img
                src="/img/hero-default.png"
                alt="Famille qui cuisine ensemble, ambiance chaleureuse"
                className="w-full h-full object-cover rounded-2xl"
              />
            </div>
            {/* Floating elements */}
            <div className="absolute -top-4 -right-4 bg-card rounded-2xl shadow-card p-4 animate-slide-up-delay border">
              <div className="text-2xl font-bold text-primary">30s</div>
              <div className="text-xs text-muted-foreground">Menu généré</div>
            </div>
            <div className="absolute -bottom-4 -left-4 bg-card rounded-2xl shadow-card p-4 animate-slide-up-delay border">
              <div className="text-2xl font-bold text-accent">100%</div>
              <div className="text-xs text-muted-foreground">Gratuit de base</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
