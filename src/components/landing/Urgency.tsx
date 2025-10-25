import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { useLanguage } from '@/contexts/LanguageContext';

interface UrgencyProps {
  onCtaClick: () => void;
}

export const Urgency = ({ onCtaClick }: UrgencyProps) => {
  const { t } = useLanguage();
  
  return (
    <section className="py-16 bg-gradient-to-br from-destructive/10 to-primary/10">
      <div className="container max-w-3xl">
        <div className="text-center p-10 bg-card rounded-2xl shadow-card">
          <AlertCircle className="w-16 h-16 mx-auto mb-6 text-destructive" />
          <h2 className="text-3xl font-bold mb-4 text-destructive">{t('urgency.title')}</h2>
          <p className="text-lg mb-4">
            {t('urgency.description1')}
          </p>
          <p className="text-lg font-semibold mb-6">
            {t('urgency.description2')}
          </p>
          <Button
            onClick={onCtaClick}
            size="lg"
            className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 rounded-xl transition-all hover:scale-105"
          >
            {t('urgency.cta')}
          </Button>
        </div>
      </div>
    </section>
  );
};
