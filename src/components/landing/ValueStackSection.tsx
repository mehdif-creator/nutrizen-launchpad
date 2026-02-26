import { Check } from 'lucide-react';

interface ValueItem {
  feature: string;
  description: string;
  value: string;
}

interface ValueStackSectionProps {
  items?: ValueItem[];
  totalValue?: string;
  price?: string;
}

const defaultItems: ValueItem[] = [
  {
    feature: 'Menus personnalisés chaque semaine',
    description: 'Adaptés à vos goûts, allergies et objectifs nutritionnels',
    value: 'valeur : ~60€/mois',
  },
  {
    feature: 'Liste de courses automatique',
    description: 'Générée en un clic, triée par rayon — fini le temps perdu',
    value: 'valeur : ~30€/mois',
  },
  {
    feature: 'Scan frigo & suggestions IA',
    description: 'Photographiez votre frigo, recevez des idées de repas instantanément',
    value: 'valeur : ~40€/mois',
  },
  {
    feature: 'Calcul automatique des macros',
    description: 'Chaque recette est équilibrée — protéines, glucides, lipides',
    value: 'valeur : ~50€/mois',
  },
  {
    feature: 'Substitutions d\'ingrédients intelligentes',
    description: 'Remplacez n\'importe quel ingrédient sans casser l\'équilibre',
    value: 'valeur : ~30€/mois',
  },
  {
    feature: 'Support prioritaire & mises à jour',
    description: 'Réponse sous 24h et accès aux nouvelles fonctionnalités en avant-première',
    value: 'valeur : ~40€/mois',
  },
];

export const ValueStackSection = ({
  items = defaultItems,
  totalValue = '~250€/mois',
  price = '12,99€/mois',
}: ValueStackSectionProps) => {
  return (
    <section className="py-16 bg-secondary/20">
      <div className="container max-w-3xl">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            Ce que vous obtenez pour moins qu'un café par semaine
          </h2>
        </div>

        <div className="space-y-5">
          {items.map((item) => (
            <div key={item.feature} className="flex items-start gap-4">
              <Check className="w-5 h-5 text-accent flex-shrink-0 mt-1" />
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
                  <span className="font-semibold text-sm">{item.feature}</span>
                  <span className="text-xs text-muted-foreground italic whitespace-nowrap">
                    {item.value}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-border mt-8 pt-6 text-center">
          <p className="text-lg">
            Valeur totale estimée :{' '}
            <span className="line-through text-muted-foreground">{totalValue}</span>{' '}
            → Votre prix :{' '}
            <span className="text-2xl font-bold text-accent">{price}</span>
          </p>
        </div>
      </div>
    </section>
  );
};
