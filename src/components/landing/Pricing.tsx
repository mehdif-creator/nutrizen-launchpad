import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Zap, Shield, ChefHat } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PricingProps {
  onCtaClick: () => void;
  pricingNote?: string;
}

export const Pricing = ({ onCtaClick, pricingNote }: PricingProps) => {
  const navigate = useNavigate();

  const freeFeatures = [
    "Génération de menu hebdomadaire",
    "Accès à toutes les recettes",
    "Liste de courses intelligente",
    "Tableau de bord personnalisé",
    "Conseils du jour",
    "Historique des menus",
  ];

  const creditFeatures = [
    { name: "Changer une recette (Swap)", cost: 1 },
    { name: "InspiFrigo - Recettes depuis ton frigo", cost: 2 },
    { name: "ScanRepas - Analyse tes repas", cost: 2 },
    { name: "Substitutions d'ingrédients", cost: 1 },
  ];

  return (
    <section id="tarifs" className="py-16 bg-gradient-to-b from-background to-secondary/20">
      <div className="container">
        <div className="text-center mb-12 animate-fade-in">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Commence gratuitement, puis active les options quand tu veux
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
            Un accès gratuit complet, des options premium à la carte.
          </p>
        </div>

        {pricingNote && (
          <div className="mb-8 p-4 bg-accent/10 rounded-lg text-center">
            <p className="text-sm text-accent-foreground">💡 {pricingNote}</p>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
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
              Commencer gratuitement
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
              <p className="text-lg font-medium text-accent">Packs à l'unité</p>
              <p className="text-sm text-muted-foreground mt-2">
                Débloque les options avancées quand tu en as besoin
              </p>
            </div>

            <div className="space-y-3 mb-6">
              <p className="text-sm font-medium text-muted-foreground mb-2">
                Fonctionnalités premium :
              </p>
              {creditFeatures.map((feature) => (
                <div key={feature.name} className="flex items-center justify-between gap-3">
                  <div className="flex items-start gap-2">
                    <Zap className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{feature.name}</span>
                  </div>
                  <span className="text-xs font-medium bg-accent/10 text-accent px-2 py-1 rounded-full whitespace-nowrap">
                    {feature.cost} crédit{feature.cost > 1 ? 's' : ''}
                  </span>
                </div>
              ))}
            </div>

            <div className="bg-muted/50 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium">Paiement unique</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Les crédits achetés n'expirent jamais. Pas d'abonnement, pas d'engagement.
              </p>
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

        {/* Trust indicators */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-green-600" />
            <span>Paiement sécurisé Stripe</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent" />
            <span>Crédits non expirants</span>
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>Tu peux rester gratuit aussi longtemps que tu veux. Les Crédits Zen sont optionnels.</p>
        </div>
      </div>
    </section>
  );
};
