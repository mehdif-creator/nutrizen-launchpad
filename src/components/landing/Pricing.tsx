import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Zap, Shield, ChefHat, Crown, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

interface PricingProps {
  onCtaClick: () => void;
  pricingNote?: string;
}

export const Pricing = ({ onCtaClick, pricingNote }: PricingProps) => {
  const navigate = useNavigate();

  const handleCheckout = (plan: string) => {
    if (plan === 'free') {
      onCtaClick();
    } else {
      navigate(`/auth/signup?plan=${plan}`);
    }
  };

  return (
    <section id="tarifs" className="py-16 bg-gradient-to-b from-background to-secondary/20">
      <div className="container">
        <div className="text-center mb-12 animate-fade-in">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Choisis ton niveau de confort nutritionnel
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-2">
            Plus tu automatises (menus + scans + ajustements), plus tu gagnes du temps.
            Les crédits servent à déclencher les actions IA.
          </p>
          <p className="text-sm text-muted-foreground">Prix TTC.</p>
        </div>

        {pricingNote && (
          <div className="mb-8 p-4 bg-accent/10 rounded-lg text-center">
            <p className="text-sm text-accent-foreground">💡 {pricingNote}</p>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {/* FREE Card — unchanged */}
          <Card className="p-6 md:p-8 relative border-2 border-muted hover:border-primary/30 transition-colors">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge variant="secondary" className="text-xs font-bold">
                Découverte
              </Badge>
            </div>

            <div className="text-center mb-6 pt-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <ChefHat className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Gratuit</h3>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-bold">0€</span>
                <span className="text-sm text-muted-foreground">TTC</span>
              </div>
              <p className="text-sm text-primary font-medium mt-2">
                14 crédits offerts (une seule fois)
              </p>
            </div>

            <div className="space-y-3 mb-8">
              {[
                "Jusqu'à 2 semaines de menus (selon ton usage)",
                "Profil + allergies + aliments à éviter pris en compte",
                "Liste de courses générée automatiquement",
              ].map((f) => (
                <div key={f} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{f}</span>
                </div>
              ))}
            </div>

            <Button onClick={() => handleCheckout('free')} className="w-full" size="lg">
              Commencer gratuitement
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">Sans carte bancaire</p>
          </Card>

          {/* STARTER Card — Hormozi rewrite */}
          <Card className="p-6 md:p-8 relative border-2 border-primary/20 hover:border-primary/40 transition-colors">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge variant="secondary" className="text-xs font-bold">
                <Star className="w-3 h-3 mr-1" />
                Essentiel
              </Badge>
            </div>

            <div className="text-center mb-6 pt-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Starter</h3>
              <p className="text-sm text-muted-foreground italic mb-3">
                Tu manges mieux dès cette semaine. Sans effort.
              </p>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-bold">12,99€</span>
                <span className="text-sm text-muted-foreground">/ mois TTC</span>
              </div>
              <p className="text-sm text-primary font-medium mt-2">80 crédits / mois</p>
            </div>

            <div className="space-y-3 mb-6">
              {[
                "Tes menus de la semaine générés en 30 secondes, adaptés à tes allergies et objectifs",
                "Ta liste de courses prête à imprimer — zéro temps perdu au supermarché",
                "80 crédits/mois pour changer une recette, scanner ton frigo, ajuster tes macros",
                "Rollover jusqu'à 20 crédits : ce que tu n'utilises pas, tu le gardes",
                "Résultat : ~10 à 13 semaines de menus complets pour le prix d'un repas au restaurant",
              ].map((f) => (
                <div key={f} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{f}</span>
                </div>
              ))}
            </div>

            <div className="bg-primary/5 rounded-lg p-3 mb-6">
              <p className="text-xs text-muted-foreground italic">
                Un diététicien te coûterait 60€ la séance. Ici, c'est 12,99€/mois, résiliable en 1 clic.
              </p>
            </div>

            <Button
              onClick={() => handleCheckout('starter')}
              variant="outline"
              className="w-full border-primary text-primary hover:bg-primary/10"
              size="lg"
            >
              Choisir Starter
            </Button>
          </Card>

          {/* PREMIUM Card — Hormozi rewrite */}
          <Card className="p-6 md:p-8 relative border-2 border-accent shadow-lg ring-2 ring-accent/20 hover:ring-accent/40 transition-all">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge className="bg-accent text-white text-xs font-bold flex items-center gap-1">
                <Crown className="w-3 h-3" />
                Recommandé • Meilleure valeur
              </Badge>
            </div>

            <div className="text-center mb-6 pt-4">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-6 w-6 text-accent" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Premium</h3>
              <p className="text-sm text-muted-foreground italic mb-3">
                Le système complet. Mange bien, dépense moins, ne réfléchis plus.
              </p>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-bold">19,99€</span>
                <span className="text-sm text-muted-foreground">/ mois TTC</span>
              </div>
              <p className="text-sm text-accent font-medium mt-2">200 crédits / mois</p>
            </div>

            <div className="space-y-3 mb-6">
              {[
                "200 crédits/mois — menus + scans frigo + ajustements sans jamais manquer de crédits",
                "Priorité de génération : tes menus arrivent plus vite que les autres utilisateurs",
                "Rollover jusqu'à 80 crédits — tes crédits s'accumulent, ils n'expirent pas",
                "-10% sur tous les packs de crédits supplémentaires",
                "Pour 7€ de plus que Starter : 2,5x plus de crédits + rollover 4x + tous les avantages Premium",
              ].map((f) => (
                <div key={f} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{f}</span>
                </div>
              ))}
            </div>

            {/* Value stack block */}
            <div className="bg-accent/5 rounded-lg p-4 mb-6 space-y-2">
              <p className="text-sm font-bold">Ce que tu obtiens :</p>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Menus personnalisés illimités (valeur : 60€/séance diét.)</span>
                  <span className="font-medium text-accent">inclus</span>
                </div>
                <div className="flex justify-between">
                  <span>Scan frigo + suggestions IA (valeur : 20€/utilisation)</span>
                  <span className="font-medium text-accent">inclus</span>
                </div>
                <div className="flex justify-between">
                  <span>Liste de courses automatique (valeur : 2h/sem. de ta vie)</span>
                  <span className="font-medium text-accent">inclus</span>
                </div>
                <div className="border-t border-accent/20 pt-2 mt-2 flex justify-between text-sm font-bold">
                  <span>Total valeur : ~300€/mois</span>
                  <span className="text-accent">→ 19,99€</span>
                </div>
              </div>
            </div>

            <Button
              onClick={() => handleCheckout('premium')}
              className="w-full bg-accent hover:bg-accent/90 text-white"
              size="lg"
            >
              Passer en Premium
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Annulable à tout moment • Upgrade en 1 clic
            </p>
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
            <span>Annulable à tout moment</span>
          </div>
        </div>
      </div>
    </section>
  );
};
