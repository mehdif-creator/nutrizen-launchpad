import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Shield, Crown, Star, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

interface ComparisonCopy {
  without: string[];
  with: string[];
}

interface PricingProps {
  onCtaClick: () => void;
  pricingNote?: string;
  comparison?: ComparisonCopy;
}

const defaultComparison: ComparisonCopy = {
  without: [
    "~45 min/soir à décider quoi cuisiner",
    "~200€/mois gaspillés en courses non planifiées",
    "21 décisions alimentaires par semaine",
  ],
  with: [
    "5 minutes le dimanche — c'est tout",
    "Économie moyenne de 200€/mois sur les courses",
    "1 décision par semaine",
  ],
};

export const Pricing = ({ onCtaClick, pricingNote, comparison = defaultComparison }: PricingProps) => {
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
            Plus tu automatises, plus tu gagnes du temps. Les crédits déclenchent les actions IA.
          </p>
          <p className="text-sm text-muted-foreground">Prix TTC.</p>
        </div>

        {/* Sans vs Avec comparison bar */}
        <div className="max-w-4xl mx-auto mb-12 rounded-2xl border border-border bg-muted/30 p-6 md:p-8">
          <div className="grid md:grid-cols-[1fr_auto_1fr] gap-6 md:gap-0">
            {/* Sans NutriZen */}
            <div className="space-y-3 md:pr-8">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Sans NutriZen</p>
              {comparison.without.map((line) => (
                <div key={line} className="flex items-start gap-2">
                  <X className="w-4 h-4 text-destructive/60 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-muted-foreground">{line}</span>
                </div>
              ))}
            </div>

            {/* VS divider */}
            <div className="hidden md:flex flex-col items-center justify-center">
              <div className="w-px h-full bg-border relative">
                <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-muted/80 border border-border rounded-full px-2.5 py-1 text-xs font-bold text-muted-foreground">VS</span>
              </div>
            </div>
            <div className="md:hidden flex items-center justify-center">
              <span className="bg-muted/80 border border-border rounded-full px-3 py-1 text-xs font-bold text-muted-foreground">VS</span>
            </div>

            {/* Avec NutriZen */}
            <div className="space-y-3 md:pl-8">
              <p className="text-xs font-bold uppercase tracking-wider text-green-500 mb-4">Avec NutriZen</p>
              {comparison.with.map((line) => (
                <div key={line} className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-foreground">{line}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {pricingNote && (
          <div className="mb-8 p-4 bg-accent/10 rounded-lg text-center">
            <p className="text-sm text-accent-foreground">💡 {pricingNote}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {/* FREE — Je découvre */}
          <Card className="p-6 md:p-8 relative border border-muted/50 opacity-90 hover:opacity-100 transition-opacity">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge variant="secondary" className="text-xs font-bold">
                Découverte
              </Badge>
            </div>

            <div className="text-center mb-6 pt-4">
              <h3 className="text-2xl font-bold mb-1">Je découvre</h3>
              <p className="text-xs text-muted-foreground mb-3">Fonctionnalités limitées</p>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-bold">0€</span>
              </div>
              <p className="text-sm text-primary font-medium mt-2">
                14 crédits offerts (une seule fois)
              </p>
            </div>

            <p className="text-xs text-muted-foreground text-center mb-4 italic">
              Fonctionnalités limitées — sans liste de courses ni macros
            </p>

            <div className="space-y-3 mb-8">
              {[
                "Jusqu'à 2 semaines de menus",
                "Profil + allergies pris en compte",
                "Liste de courses automatique",
              ].map((f) => (
                <div key={f} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-muted-foreground">{f}</span>
                </div>
              ))}
            </div>

            <Button onClick={() => handleCheckout('free')} variant="outline" className="w-full" size="lg">
              Commencer gratuitement
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">Sans carte bancaire</p>
          </Card>

          {/* STARTER — Je simplifie */}
          <Card className="p-6 md:p-8 relative border-2 border-primary/20 hover:border-primary/40 transition-colors">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge variant="secondary" className="text-xs font-bold">
                <Star className="w-3 h-3 mr-1" />
                Essentiel
              </Badge>
            </div>

            <div className="text-center mb-6 pt-4">
              <h3 className="text-2xl font-bold mb-1">Je simplifie</h3>
              <p className="text-sm text-muted-foreground italic mb-3">
                Mange mieux dès cette semaine. Sans effort.
              </p>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-bold">12,99€</span>
                <span className="text-sm text-muted-foreground">/ mois</span>
              </div>
              <p className="text-xs text-green-500 font-medium mt-1">
                Soit 3,25€/semaine — moins qu'un café
              </p>
              <p className="text-xs text-muted-foreground italic mt-1">
                Nos utilisateurs économisent en moyenne 200€/mois en courses
              </p>
              <p className="text-sm text-primary font-medium mt-2">80 crédits / mois</p>
            </div>

            <div className="space-y-3 mb-8">
              {[
                "Menus de la semaine en 30 secondes, adaptés à ton profil",
                "Liste de courses prête à imprimer",
                "80 crédits/mois pour swaps, scans frigo, macros",
                "Rollover jusqu'à 20 crédits non utilisés",
              ].map((f) => (
                <div key={f} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{f}</span>
                </div>
              ))}
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

          {/* PREMIUM — Je reprends le contrôle */}
          <Card className="p-6 md:p-8 relative border-2 border-accent shadow-lg ring-2 ring-accent/20 hover:ring-accent/40 transition-all">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge className="bg-accent text-white text-xs font-bold flex items-center gap-1">
                <Crown className="w-3 h-3" />
                Recommandé
              </Badge>
            </div>

            <div className="text-center mb-6 pt-4">
              <h3 className="text-2xl font-bold mb-1">Je reprends le contrôle</h3>
              <p className="text-sm text-muted-foreground italic mb-3">
                Le système complet. Mange bien, dépense moins.
              </p>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-bold">19,99€</span>
                <span className="text-sm text-muted-foreground">/ mois</span>
              </div>
              <p className="text-xs text-green-500 font-medium mt-1">
                Soit 5€/semaine — moins qu'un déjeuner
              </p>
              <p className="text-xs text-muted-foreground italic mt-1">
                Économisez jusqu'à 2 400€/an sur votre budget courses
              </p>
              <p className="text-sm text-accent font-medium mt-2">200 crédits / mois</p>
            </div>

            <div className="space-y-3 mb-8">
              {[
                "200 crédits/mois — menus + scans + ajustements illimités",
                "Priorité de génération : résultats plus rapides",
                "Rollover jusqu'à 80 crédits",
                "-10% sur les packs de crédits supplémentaires",
              ].map((f) => (
                <div key={f} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{f}</span>
                </div>
              ))}
            </div>

            <Button
              onClick={() => handleCheckout('premium')}
              className="w-full bg-accent hover:bg-accent/90 text-white"
              size="lg"
            >
              Passer en Premium
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Annulable à tout moment
            </p>
          </Card>
        </div>

        {/* ROI summary line */}
        <p className="text-center text-sm text-muted-foreground italic mt-10 max-w-xl mx-auto">
          Pour 12,99€/mois, la plupart de nos utilisateurs économisent plus de{' '}
          <span className="font-bold text-accent not-italic">15x</span> ce montant sur leur budget courses.
        </p>

        {/* Trust indicators */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-green-500" />
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
