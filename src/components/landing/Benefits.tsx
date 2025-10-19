import { Clock, Coins, Brain } from 'lucide-react';
import { Card } from '@/components/ui/card';
export const Benefits = () => {
  const benefits = [{
    icon: Clock,
    title: 'Gagne 5h par semaine',
    result: 'Plus de temps pour toi',
    description: 'Fini les 30 min quotidiennes à te demander "qu\'est-ce qu\'on mange ?". Tout est planifié automatiquement.'
  }, {
    icon: Coins,
    title: 'Économise jusqu\'à 30%',
    result: 'Liste de courses optimisée',
    description: 'Ton plan génère une liste précise par rayon. Exit les achats impulsifs et le gaspillage.'
  }, {
    icon: Brain,
    title: 'Zéro charge mentale',
    result: 'Menus équilibrés automatiques',
    description: 'Ton plan adapté à tes objectifs (perte, maintien, prise). Tout est calculé et prêt en 1 clic.'
  }];
  return <section id="avantages" className="py-16 bg-muted/30">
      <div className="container">
        <div className="text-center mb-12 animate-fade-in">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Pourquoi choisir myNutriZen ?</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {benefits.map((benefit, index) => <Card key={benefit.title} className="p-8 text-center bg-background border-border shadow-card hover:shadow-lg transition-tech animate-fade-in" style={{
          animationDelay: `${index * 0.1}s`
        }}>
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary/10 to-accent/10 mb-6">
                <benefit.icon className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">{benefit.title}</h3>
              <p className="text-sm font-medium text-primary mb-2">{benefit.result}</p>
              <p className="text-muted-foreground leading-relaxed text-sm">
                {benefit.description}
              </p>
            </Card>)}
        </div>
      </div>
    </section>;
};