import { Card } from '@/components/ui/card';

const columns = [
  {
    emoji: '💪',
    title: 'Votre nutrition ne suit pas vos efforts',
    text: "Vous êtes régulier à l'entraînement mais vos résultats stagnent. L'alimentation est le maillon manquant — et vous le savez.",
  },
  {
    emoji: '📊',
    title: 'Vous comptez vos macros manuellement',
    text: "MyFitnessPal, calculs à la main, estimations approximatives... Ça prend 20 à 30 minutes par jour pour un résultat peu fiable.",
  },
  {
    emoji: '🍳',
    title: 'Vous mangez toujours les mêmes 4 repas',
    text: "Riz, poulet, œufs, fromage blanc. Efficace mais épuisant sur la durée. Vous manquez d'idées de repas hauts en protéines et variés.",
  },
];

export const FitMadeForYou = () => {
  return (
    <section className="py-16 bg-muted/30">
      <div className="container">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
          NutriZen Fit est fait pour vous si...
        </h2>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-8">
          {columns.map((col) => (
            <Card key={col.title} className="p-6 text-center border-border">
              <div className="text-4xl mb-4">{col.emoji}</div>
              <h3 className="font-bold text-lg mb-2">{col.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{col.text}</p>
            </Card>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground italic">
          Si vous vous reconnaissez — NutriZen Fit a été conçu précisément pour vous.
        </p>
      </div>
    </section>
  );
};
