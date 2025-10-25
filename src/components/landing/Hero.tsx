import { Button } from "@/components/ui/button";
import { Star, Check } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface HeroProps {
  onCtaClick: () => void;
  onExampleClick: () => void;
}

export const Hero = ({ onCtaClick, onExampleClick }: HeroProps) => {
  const { t } = useLanguage();
  
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-background via-secondary/30 to-background">
      <div className="container py-16 md:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Content */}
          <div className="space-y-8 animate-fade-in">
            {/* Preuve sociale immédiate */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 rounded-full text-sm">
              <span className="text-accent font-semibold">{t('hero.badge')}</span>
              <span className="text-muted-foreground">{t('hero.badgeSuffix')}</span>
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                {t('hero.title')}
              </h1>
              <p className="text-xl text-muted-foreground font-medium">
                {t('hero.subtitle')}
              </p>
              <div className="space-y-2 text-lg">
                <p className="flex items-start gap-2">
                  <span className="text-primary font-bold">→</span>
                  <span>
                    <strong>{t('hero.benefit1')}</strong> {t('hero.benefit1Desc')}
                  </span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-primary font-bold">→</span>
                  <span>
                    <strong>{t('hero.benefit2')}</strong> {t('hero.benefit2Desc')}
                  </span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-primary font-bold">→</span>
                  <span>
                    <strong>{t('hero.benefit3')}</strong> {t('hero.benefit3Desc')}
                  </span>
                </p>
              </div>
            </div>

            {/* CTAs */}
            <div className="space-y-3">
              <Button
                onClick={onCtaClick}
                size="lg"
                className="w-full sm:w-auto bg-gradient-to-r from-primary to-accent text-white hover:scale-[1.02] active:scale-[0.99] shadow-glow transition-tech text-base md:text-lg px-6 md:px-8 py-4"
              >
                {t('hero.cta')}
              </Button>
              <p className="text-xs md:text-sm text-muted-foreground">
                <strong>{t('hero.trial')}</strong> {t('hero.trialDetails')}
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
                <span className="font-medium">{t('hero.rating')}</span>
                <span className="text-muted-foreground">{t('hero.reviews')}</span>
              </div>

              <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-4 text-xs md:text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>{t('hero.cancelAnytime')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>{t('hero.guarantee')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>{t('hero.validated')}</span>
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
              <div className="text-xs text-muted-foreground">{t('hero.menuGenerated')}</div>
            </div>
            <div className="absolute -bottom-4 -left-4 bg-card rounded-2xl shadow-card p-4 animate-slide-up-delay border">
              <div className="text-2xl font-bold text-accent">{t('hero.autoShoppingList').split(' ')[0]}</div>
              <div className="text-xs text-muted-foreground">{t('hero.autoShoppingList').split(' ')[1]}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
