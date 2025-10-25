import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { PersonaConfig } from '@/config/personas';
import { useLanguage } from '@/contexts/LanguageContext';

interface PASSectionProps {
  config: PersonaConfig;
}

export const PASSection = ({ config }: PASSectionProps) => {
  const { t } = useLanguage();
  
  const solutions = [
    t('pas.solution1'),
    t('pas.solution2'),
    t('pas.solution3'),
    t('pas.solution4')
  ];

  return (
    <section id="avantages" className="py-16 bg-background">
      <div className="container">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Pain & Agitate */}
          <div className="space-y-6 animate-fade-in">
            <div className="inline-block px-4 py-2 bg-error/10 text-error rounded-full text-sm font-medium">
              {t('pas.tag')}
            </div>
            <h2 className="text-3xl md:text-4xl font-bold">
              {t('pas.title')}
            </h2>
            <div className="space-y-4">
              {config.pain.map((pain, index) => (
                <div key={index} className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
                  <p className="text-muted-foreground">{pain}</p>
                </div>
              ))}
            </div>
            <div className="p-4 bg-muted rounded-lg border-l-4 border-error">
              <p className="text-sm text-muted-foreground">
                {t('pas.resultNote')}
              </p>
            </div>
          </div>

          {/* Solution */}
          <div className="space-y-6 animate-slide-up">
            <div className="inline-block px-4 py-2 bg-success/10 text-success rounded-full text-sm font-medium">
              {t('pas.solutionTag')}
            </div>
            <h3 className="text-2xl md:text-3xl font-bold">
              {t('pas.solutionTitle')}
            </h3>
            <div className="space-y-4">
              {solutions.map((solution, index) => (
                <div key={index} className="flex gap-3">
                  <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                  <p className="font-medium">{solution}</p>
                </div>
              ))}
            </div>
            <div className="p-6 bg-gradient-to-br from-primary/5 to-accent/5 rounded-lg border">
              <h4 className="font-bold mb-2">{t('pas.benefitsTitle')}</h4>
              <ul className="space-y-2">
                {config.benefits.map((benefit, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
