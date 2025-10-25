import { Card } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';

export const EconomicComparison = () => {
  const { t } = useLanguage();
  
  return (
    <section className="py-16 bg-muted/30">
      <div className="container">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            {t('economic.title')}
          </h2>
          <p className="text-center text-lg text-muted-foreground mb-12">
            {t('economic.subtitle')}
          </p>

          <Card className="p-8 md:p-12 bg-gradient-to-br from-primary/5 to-accent/5 border-2 border-primary/20 shadow-lg">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-3 px-6 py-3 bg-success/10 border-2 border-success/30 rounded-2xl mb-6">
                <span className="text-3xl">💡</span>
                <span className="text-xl font-bold text-foreground">{t('economic.intro')}</span>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div className="text-center p-6 bg-card rounded-2xl border-2 border-border">
                <div className="text-5xl mb-3">⏰</div>
                <div className="text-4xl font-bold text-primary mb-2">3h</div>
                <div className="text-lg font-medium text-foreground">{t('economic.time')}</div>
                <div className="text-sm text-muted-foreground mt-2">
                  {t('economic.timeNote')}
                </div>
              </div>

              <div className="text-center p-6 bg-card rounded-2xl border-2 border-border">
                <div className="text-5xl mb-3">💰</div>
                <div className="text-4xl font-bold text-success mb-2">200€</div>
                <div className="text-lg font-medium text-foreground">{t('economic.savings')}</div>
                <div className="text-sm text-muted-foreground mt-2">
                  {t('economic.savingsNote')}
                </div>
              </div>
            </div>

            <div className="text-center pt-6 border-t-2 border-border">
              <p className="text-2xl font-bold text-primary mb-2">
                {t('economic.yearTotal')}
              </p>
              <p className="text-muted-foreground">
                {t('economic.timeTotal')}
              </p>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
};
