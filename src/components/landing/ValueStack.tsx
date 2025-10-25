import { useLanguage } from '@/contexts/LanguageContext';

export const ValueStack = () => {
  const { t } = useLanguage();
  
  return (
    <section className="py-16 bg-muted/30">
      <div className="container max-w-5xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('value.title')}</h2>
          <p className="text-lg text-muted-foreground">{t('value.subtitle')}</p>
        </div>

        <div className="bg-card rounded-2xl shadow-lg border-2 border-primary/20 p-8 md:p-12">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-border">
                  <th className="py-4 pr-4 text-left text-lg font-bold">{t('value.advantage')}</th>
                  <th className="py-4 text-right text-lg font-bold">{t('value.value')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr className="hover:bg-muted/50 transition-colors">
                  <td className="py-4 pr-4 text-left">{t('value.menus')}</td>
                  <td className="py-4 text-right text-lg font-semibold">59 €/mois</td>
                </tr>
                <tr className="hover:bg-muted/50 transition-colors">
                  <td className="py-4 pr-4 text-left">{t('value.recipes')}</td>
                  <td className="py-4 text-right text-lg font-semibold">39 €/mois</td>
                </tr>
                <tr className="hover:bg-muted/50 transition-colors">
                  <td className="py-4 pr-4 text-left">{t('value.shopping')}</td>
                  <td className="py-4 text-right text-lg font-semibold">29 €/mois</td>
                </tr>
                <tr className="hover:bg-muted/50 transition-colors">
                  <td className="py-4 pr-4 text-left">{t('value.advice')}</td>
                  <td className="py-4 text-right text-lg font-semibold">49 €/mois</td>
                </tr>
                <tr className="hover:bg-muted/50 transition-colors">
                  <td className="py-4 pr-4 text-left">{t('value.tracking')}</td>
                  <td className="py-4 text-right text-lg font-semibold">29 €/mois</td>
                </tr>
                <tr className="hover:bg-muted/50 transition-colors">
                  <td className="py-4 pr-4 text-left">{t('value.scanRepas')}</td>
                  <td className="py-4 text-right text-lg font-semibold">19 €/mois</td>
                </tr>
                <tr className="border-t-4 border-primary/30 bg-primary/5">
                  <td className="py-5 pr-4 text-left font-bold text-xl">{t('value.total')}</td>
                  <td className="py-5 text-right font-bold text-2xl text-primary">205 €/mois</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-8 pt-8 border-t-2 border-border">
            <div className="text-center">
              <p className="text-lg text-muted-foreground mb-2">{t('value.yourPrice')}</p>
              <p className="text-4xl md:text-5xl font-bold text-primary mb-3">19,99 €/mois</p>
              <div className="inline-flex items-center gap-2 px-6 py-3 bg-success/10 border-2 border-success/30 rounded-full">
                <span className="text-2xl">✅</span>
                <span className="font-bold text-success text-lg">{t('value.saving')}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-4">{t('value.trial')}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
