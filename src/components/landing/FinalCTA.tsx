import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

interface FinalCTAProps {
  onCtaClick: () => void;
}

export const FinalCTA = ({ onCtaClick }: FinalCTAProps) => {
  const { t } = useLanguage();
  
  return (
    <section className="py-24 bg-gradient-to-br from-accent/10 to-primary/10">
      <div className="container">
        <div className="max-w-3xl mx-auto text-center space-y-8 animate-fade-in">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight">
            {t('finalCta.title')}
          </h2>
          
          <div className="space-y-3 flex flex-col items-center">
            <Button
              onClick={onCtaClick}
              size="lg"
              className="bg-gradient-to-r from-primary to-accent text-white hover:scale-[1.02] active:scale-[0.99] shadow-glow transition-tech text-lg px-12 w-full sm:w-auto"
            >
              {t('finalCta.cta')}
            </Button>
            <p className="text-sm text-muted-foreground">
              {t('finalCta.note')}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
