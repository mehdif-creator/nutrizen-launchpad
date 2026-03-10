import { Button } from "@/components/ui/button";
import { Star, Check, Clock, ShoppingBag, Heart, Zap } from "lucide-react";
import type { HeroCopy } from "@/config/marketingCopy";

interface HeroProps {
  onCtaClick: () => void;
  onExampleClick: () => void;
  copy?: HeroCopy;
}

const iconMap = {
  heart: Heart,
  shopping: ShoppingBag,
  clock: Clock,
  zap: Zap,
};

export const Hero = ({ onCtaClick, onExampleClick, copy }: HeroProps) => {
  const handleSecondaryClick = () => {
    if (copy?.secondaryAction === 'quiz') {
      const element = document.getElementById('quiz-profil');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    onExampleClick();
  };

  const badge = copy?.badge;
  const h1 = copy?.h1 || 'Fini de te demander "On mange quoi ce soir?"';
  const subtitle = copy?.subtitle || 'Ton menu de la semaine personnalisé en 30 secondes.';
  const bullets = copy?.bullets || [
    { icon: 'heart' as const, bold: 'Un menu qui plaît à toute la famille', text: "— fini les \"j'aime pas ça\"" },
    { icon: 'shopping' as const, bold: 'Ta liste de courses générée', text: '— courses en 20 min chrono' },
    { icon: 'clock' as const, bold: 'Des recettes de 15–30 min', text: '— réalistes, pas des recettes de magazine' },
  ];
  const primaryCta = copy?.primaryCta || 'Créer mon menu gratuit';
  const secondaryCta = copy?.secondaryCta || 'Voir un exemple de semaine';
  const socialProof = copy?.socialProof || '+2 000 familles';
  const socialProofSuffix = copy?.socialProofSuffix || 'ont retrouvé la sérénité des repas';
  const heroImage = copy?.heroImage || '/img/hero-default.jpg';
  const heroImageAlt = copy?.heroImageAlt || 'Maman sereine qui cuisine avec ses enfants';
  const floatingTop = copy?.floatingTop || { value: '30s', label: 'Menu personnalisé' };
  const floatingBottom = copy?.floatingBottom || { value: '5h', label: 'Économisées/semaine' };
  const trustLine = copy?.trustLine || 'Compte gratuit à vie — Sans carte bancaire, en 30 secondes';

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-background via-secondary/30 to-background">
      <div className="container py-16 md:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Content */}
          <div className="space-y-8 animate-fade-in">
            {/* Social proof */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 rounded-full text-sm">
              <span className="text-accent font-semibold">{socialProof}</span>
              <span className="text-muted-foreground">{socialProofSuffix}</span>
            </div>

            <div className="space-y-4">
              {badge && (
                <div className="inline-block px-4 py-2 bg-primary/10 rounded-full text-sm font-medium text-primary mb-2">
                  {badge}
                </div>
              )}
              <h1 className="text-[clamp(1.75rem,5vw,3rem)] md:text-5xl lg:text-6xl font-bold leading-tight">
                {h1}
              </h1>
              <p className="text-xl text-muted-foreground font-medium">
                {subtitle}
              </p>
              <div className="space-y-3 text-lg pt-2">
                {bullets.map((bullet, index) => {
                  const Icon = iconMap[bullet.icon];
                  return (
                    <p key={index} className="flex items-start gap-3">
                      <Icon className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                      <span>
                        <strong>{bullet.bold}</strong> {bullet.text}
                      </span>
                    </p>
                  );
                })}
              </div>
            </div>

            {/* CTAs */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                <Button
                  onClick={onCtaClick}
                  size="lg"
                  className="w-full sm:w-auto bg-gradient-to-r from-primary to-accent text-white active:scale-[0.99] shadow-glow transition-tech text-base md:text-lg px-6 md:px-8 min-h-[52px]"
                >
                  {primaryCta}
                </Button>
                <Button
                  onClick={handleSecondaryClick}
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto text-base md:text-lg px-6 md:px-8 py-4"
                >
                  {secondaryCta}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                <strong>{trustLine}</strong>
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
                src={heroImage}
                alt={heroImageAlt}
                className="w-full h-full object-cover rounded-2xl"
                width={600}
                height={600}
                fetchPriority="high"
                decoding="sync"
                loading="eager"
              />
            </div>
            {/* Floating elements */}
            <div className="absolute -top-4 -right-4 bg-card rounded-2xl shadow-card p-4 animate-slide-up-delay border">
              <div className="text-2xl font-bold text-primary">{floatingTop.value}</div>
              <div className="text-xs text-muted-foreground">{floatingTop.label}</div>
            </div>
            <div className="absolute -bottom-4 -left-4 bg-card rounded-2xl shadow-card p-4 animate-slide-up-delay border">
              <div className="text-2xl font-bold text-accent">{floatingBottom.value}</div>
              <div className="text-xs text-muted-foreground">{floatingBottom.label}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
