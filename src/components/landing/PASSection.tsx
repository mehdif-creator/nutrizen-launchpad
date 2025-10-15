import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { PersonaConfig } from '@/config/personas';

interface PASSectionProps {
  config: PersonaConfig;
}

export const PASSection = ({ config }: PASSectionProps) => {
  const solutions = [
    'Menus orientés objectifs en 30 secondes',
    'Liste de courses automatique',
    'Swaps intelligents en 1 clic',
    'Astuce quotidienne personnalisée'
  ];

  return (
    <section id="avantages" className="py-16 bg-background">
      <div className="container">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Pain & Agitate */}
          <div className="space-y-6 animate-fade-in">
            <div className="inline-block px-4 py-2 bg-error/10 text-error rounded-full text-sm font-medium">
              Tu te reconnais ?
            </div>
            <h2 className="text-3xl md:text-4xl font-bold">
              Arrête de perdre du temps
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
                Résultat : tu perds du temps, de l'argent, et tes objectifs stagnent.
              </p>
            </div>
          </div>

          {/* Solution */}
          <div className="space-y-6 animate-slide-up">
            <div className="inline-block px-4 py-2 bg-success/10 text-success rounded-full text-sm font-medium">
              La solution
            </div>
            <h3 className="text-2xl md:text-3xl font-bold">
              NutriZen s'occupe de tout
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
              <h4 className="font-bold mb-2">Les bénéfices :</h4>
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
