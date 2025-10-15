import { Button } from '@/components/ui/button';
import { Star, Shield, Check } from 'lucide-react';
import { PersonaConfig } from '@/config/personas';

interface HeroProps {
  config: PersonaConfig;
  onCtaClick: () => void;
  onExampleClick: () => void;
}

export const Hero = ({ config, onCtaClick, onExampleClick }: HeroProps) => {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-background via-secondary/30 to-background">
      <div className="container py-16 md:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Content */}
          <div className="space-y-8 animate-fade-in">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                {config.h1}
              </h1>
              <p className="text-xl text-muted-foreground">
                {config.sub}
              </p>
              
              {/* Pains explicites */}
              <div className="space-y-2 pt-2">
                {config.painExplicit.map((pain, index) => (
                  <div key={index} className="flex items-center gap-2 text-muted-foreground">
                    <div className="w-1.5 h-1.5 rounded-full bg-error" />
                    <span className="text-sm">{pain}</span>
                  </div>
                ))}
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
                  Commencer ma semaine gratuite
                </Button>
                <Button
                  onClick={onExampleClick}
                  size="lg"
                  variant="outline"
                  className="text-lg px-8 hover:scale-[1.02] active:scale-[0.99] transition-tech"
                >
                  Voir un exemple de semaine
                </Button>
              </div>
              <p className="text-xs text-muted-foreground pl-1">Aucune CB requise</p>
            </div>

            {/* Trust Indicators */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className="w-4 h-4 fill-accent text-accent"
                    />
                  ))}
                </div>
                <span className="font-medium">4,8/5</span>
                <span className="text-muted-foreground">sur 2 400+ avis</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="w-4 h-4 text-primary" />
                <span>Validé par un(e) diététicien(ne)</span>
              </div>
            </div>

            {/* Micro-assurances */}
            <div className="flex flex-wrap gap-6 pt-4">
              <div className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-success" />
                <span>Annulable en 3 clics</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-success" />
                <span>Remboursé 30 j si aucun temps gagné</span>
              </div>
            </div>
          </div>

          {/* Right: Hero Image */}
          <div className="relative animate-slide-up">
            <div className="aspect-square rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
              <img
                src={config.heroImage}
                alt="Hero illustration"
                className="w-full h-full object-cover rounded-2xl"
                onError={(e) => {
                  // Fallback to placeholder
                  e.currentTarget.src = '/placeholder.svg';
                }}
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
