import { ShieldCheck } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export const Guarantee = () => {
  const { t } = useLanguage();
  
  return (
    <section className="py-16 bg-gradient-to-br from-primary/5 to-accent/5">
      <div className="container max-w-3xl">
        <div className="text-center p-10 bg-card rounded-2xl shadow-card">
          <ShieldCheck className="w-16 h-16 mx-auto mb-6 text-primary" />
          <h2 className="text-3xl font-bold mb-4 text-primary">{t('guarantee.title')}</h2>
          <p className="text-lg text-muted-foreground">
            {t('guarantee.description')}
          </p>
        </div>
      </div>
    </section>
  );
};
