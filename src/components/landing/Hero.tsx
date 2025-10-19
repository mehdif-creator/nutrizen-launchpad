import { Button } from "@/components/ui/button";
import { Star, Check } from "lucide-react";

interface HeroProps {
  onCtaClick: () => void;
  onExampleClick: () => void;
}

export const Hero = ({ onCtaClick, onExampleClick }: HeroProps) => {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-background via-secondary/30 to-background">
      <div className="container py-16 md:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Content */}
          <div className="space-y-8 animate-fade-in">
            {/* Preuve sociale immédiate */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 rounded-full text-sm">
              <span className="text-accent font-semibold">🔥 +1 000 utilisateurs</span>
              <span className="text-muted-foreground">· 92% prolongent après essai</span>
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                Menus adaptés à tes objectifs en 30 secondes
              </h1>
              <p className="text-xl text-muted-foreground font-medium">
                Sans passer des heures à réfléchir, planifier et calculer.
              </p>
              <div className="space-y-2 text-lg">
                <p className="flex items-start gap-2">
                  <span className="text-primary font-bold">→</span>
                  <span>
                    <strong>Gagne 5h par semaine</strong> sur ta planification repas
                  </span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-primary font-bold">→</span>
                  <span>
                    <strong>Ton plan adapté</strong> à tes objectifs (perte, maintien, prise)
                  </span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-primary font-bold">→</span>
                  <span>
                    <strong>Plus de prise de tête</strong> : tout est calculé pour toi
                  </span>
                </p>
              </div>
            </div>

            {/* CTAs */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  onClick={onCtaClick}
                  size="lg"
                  className="bg-gradient-to-r from-primary to-accent text-white hover:scale-[1.02] active:scale-[0.99] shadow-glow transition-tech text-lg px-8"
                >
                  Commencer mon essai gratuit 7 jours – sans engagement.
                </Button>
                <Button
                  onClick={onExampleClick}
                  size="lg"
                  variant="outline"
                  className="text-lg px-8 hover:scale-[1.02] active:scale-[0.99] transition-tech"
                >
                  Voir un exemple
                </Button>
              </div>
              <p className="text-sm text-muted-foreground pl-1">
                <strong>Essai gratuit 7 jours</strong> · Aucun engagement · Aucune carte bancaire requise
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
                <span className="font-medium">4,8/5</span>
                <span className="text-muted-foreground">· +2 400 avis</span>
              </div>

              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-primary" />
                  <span>Annulable en 3 clics</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-primary" />
                  <span>Garantie temps-gagné 30j</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-primary" />
                  <span>Validé par diététicien(ne)</span>
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
            <div className="absolute -top-4 -right-4 bg-white rounded-2xl shadow-card p-4 animate-slide-up-delay">
              <div className="text-2xl font-bold text-primary">30s</div>
              <div className="text-xs text-muted-foreground">Menu généré</div>
            </div>
            <div className="absolute -bottom-4 -left-4 bg-white rounded-2xl shadow-card p-4 animate-slide-up-delay">
              <div className="text-2xl font-bold text-accent">Liste</div>
              <div className="text-xs text-muted-foreground">Courses auto</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
