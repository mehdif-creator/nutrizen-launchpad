import { Check, Sparkles, ChefHat, Zap, Shield } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface ValueStackProps {
  onCtaClick?: () => void;
}

export const ValueStack = ({ onCtaClick }: ValueStackProps) => {
  const navigate = useNavigate();

  const freeFeatures = [
    'Menus de la semaine personnalisés',
    'Recettes détaillées avec instructions',
    'Macros calculés automatiquement',
    'Liste de courses liée à ta semaine',
    'Tableau de bord personnel',
    'Accès multi-appareils',
    'Historique de tes menus',
  ];

  const creditPacks = [
    { name: 'Pack S', credits: 50, price: '4,99 €', bonus: '' },
    { name: 'Pack M', credits: 120, price: '9,99 €', bonus: '+20 bonus' },
    { name: 'Pack L', credits: 300, price: '19,99 €', bonus: '+50 bonus' },
  ];
  
  return (
    <section id="valeur" className="py-16 bg-muted/30">
      <div className="container max-w-5xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Tout ce dont tu as besoin pour manger sainement
          </h2>
          <p className="text-lg text-muted-foreground">
            Un accès gratuit complet, des options premium à la carte.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 md:gap-8">
          {/* Free Plan Card */}
          <Card className="p-6 md:p-8 relative border-2 border-primary/20 hover:border-primary/40 transition-colors">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <div className="px-4 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full">
                GRATUIT À VIE
              </div>
            </div>

            <div className="text-center mb-6 pt-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <ChefHat className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Compte gratuit</h3>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-bold">0 €</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Tout ce qu'il faut pour manger sainement
              </p>
            </div>

            <div className="space-y-3 mb-8">
              {freeFeatures.map((feature) => (
                <div key={feature} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>

            <Button
              onClick={onCtaClick}
              className="w-full bg-primary hover:bg-primary/90"
              size="lg"
            >
              Créer mon compte gratuit
            </Button>
          </Card>

          {/* Credits Card */}
          <Card className="p-6 md:p-8 relative border-2 border-accent/30 hover:border-accent/50 transition-colors">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <div className="px-4 py-1 bg-accent text-white text-xs font-bold rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                OPTIONS PREMIUM
              </div>
            </div>

            <div className="text-center mb-6 pt-4">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-6 w-6 text-accent" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Crédits Zen</h3>
              <p className="text-lg font-medium text-accent">Paiement unique</p>
              <p className="text-sm text-muted-foreground mt-2">
                Débloque les fonctionnalités avancées quand tu en as besoin.
              </p>
            </div>

            <div className="space-y-3 mb-4">
              <p className="text-sm font-medium text-muted-foreground mb-2">
                Ce que tu peux débloquer :
              </p>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-accent flex-shrink-0" />
                  <span className="text-sm">Changer une recette (Swap)</span>
                </div>
                <span className="text-xs font-medium bg-accent/10 text-accent px-2 py-1 rounded-full">1 crédit</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-accent flex-shrink-0" />
                  <span className="text-sm">InspiFrigo / ScanRepas</span>
                </div>
                <span className="text-xs font-medium bg-accent/10 text-accent px-2 py-1 rounded-full">2 crédits</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-accent flex-shrink-0" />
                  <span className="text-sm">Substitutions d'ingrédients</span>
                </div>
                <span className="text-xs font-medium bg-accent/10 text-accent px-2 py-1 rounded-full">1 crédit</span>
              </div>
            </div>

            {/* Credit Packs Preview */}
            <div className="bg-muted/50 rounded-lg p-4 mb-6">
              <p className="text-xs font-medium text-muted-foreground mb-3">Packs disponibles :</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                {creditPacks.map((pack) => (
                  <div key={pack.name} className="bg-background rounded-md p-2">
                    <div className="text-xs font-bold text-accent">{pack.name}</div>
                    <div className="text-sm font-semibold">{pack.credits}</div>
                    <div className="text-xs text-muted-foreground">{pack.price}</div>
                    {pack.bonus && (
                      <div className="text-[10px] text-accent">{pack.bonus}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 mb-4 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
              <Shield className="w-4 h-4 text-green-600 flex-shrink-0" />
              <span className="text-xs text-green-700 dark:text-green-400">
                Les crédits n'expirent jamais. Pas d'abonnement.
              </span>
            </div>

            <Button
              onClick={() => navigate('/credits')}
              variant="outline"
              className="w-full border-accent text-accent hover:bg-accent/10"
              size="lg"
            >
              Voir les packs Crédits Zen
            </Button>
          </Card>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-8">
          Tu peux rester gratuit aussi longtemps que tu veux. Les Crédits Zen sont optionnels.
        </p>
      </div>
    </section>
  );
};
