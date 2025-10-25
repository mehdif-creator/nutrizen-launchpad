import { Card } from '@/components/ui/card';
import { Target, Sparkles, ShoppingCart, ChefHat } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export const HowItWorks = () => {
  const { t } = useLanguage();
  
  const steps = [
    {
      icon: Target,
      number: '1',
      title: t('howItWorks.step1.title'),
      description: t('howItWorks.step1.description')
    },
    {
      icon: Sparkles,
      number: '2',
      title: t('howItWorks.step2.title'),
      description: t('howItWorks.step2.description')
    },
    {
      icon: ShoppingCart,
      number: '3',
      title: t('howItWorks.step3.title'),
      description: t('howItWorks.step3.description')
    }
  ];

  return (
    <section id="comment" className="py-16 bg-gradient-to-b from-secondary/20 to-background">
      <div className="container">
        <div className="text-center mb-12 animate-fade-in">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t('howItWorks.title')}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('howItWorks.subtitle')}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <Card
                key={step.number}
                className="p-6 relative overflow-hidden bg-background border-border shadow-card hover:shadow-lg transition-tech animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="absolute top-4 right-4 text-6xl font-bold text-primary/5">
                  {step.number}
                </div>
                <div className="relative space-y-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};
