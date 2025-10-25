import { Card } from '@/components/ui/card';
import { PersonaKey } from '@/config/personas';
import { Dumbbell, Zap, TrendingUp } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface PersonaCardsProps {
  onPersonaChange: (persona: PersonaKey) => void;
}

export const PersonaCards = ({ onPersonaChange }: PersonaCardsProps) => {
  const { t } = useLanguage();
  
  const personas = [
    {
      key: 'thomas' as PersonaKey,
      icon: Dumbbell,
      title: t('personas.muscu.title'),
      description: t('personas.muscu.description'),
      cta: t('personas.muscu.cta')
    },
    {
      key: 'sarah' as PersonaKey,
      icon: Zap,
      title: t('personas.crossfit.title'),
      description: t('personas.crossfit.description'),
      cta: t('personas.crossfit.cta')
    },
    {
      key: 'kevin' as PersonaKey,
      icon: TrendingUp,
      title: t('personas.running.title'),
      description: t('personas.running.description'),
      cta: t('personas.running.cta')
    }
  ];

  return (
    <section id="personas" className="py-16 bg-gradient-to-b from-background to-secondary/20">
      <div className="container">
        <div className="text-center mb-12 animate-fade-in">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t('personas.title')}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('personas.subtitle')}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 animate-slide-up">
          {personas.map((persona) => {
            const Icon = persona.icon;
            return (
              <Card
                key={persona.key}
                className="p-6 cursor-pointer card-hover"
                onClick={() => onPersonaChange(persona.key)}
              >
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                    <Icon className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold">{persona.title}</h3>
                  <p className="text-muted-foreground">{persona.description}</p>
                  <div className="pt-2">
                    <span className="text-primary font-medium hover:underline">
                      {persona.cta} →
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};
