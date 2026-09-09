import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Shield, Crown, Star, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { BillingToggle } from "@/components/landing/BillingToggle";
import {
  PLANS,
  getTotalPrice,
  getEffectiveMonthlyPrice,
  getYearlySavings,
  getPlanKey,
  formatEUR,
  TRIAL,
  type BillingInterval,
  type PlanTier,
} from "@/config/pricing";
import { trackInitiateCheckout } from "@/lib/metaPixel";
import { trackCheckout as trackPinterestCheckout } from "@/lib/pinterestPixel";

interface ComparisonCopy {
  without: string[];
  with: string[];
}

interface PricingProps {
  onCtaClick?: () => void;
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

/** Price block for a paid plan card. Switches between monthly and yearly display. */
const PriceBlock = ({
  tier,
  interval,
  accent = "primary",
}: {
  tier: PlanTier;
  interval: BillingInterval;
  accent?: "primary" | "accent";
}) => {
  const total = getTotalPrice(tier, interval);
  const effectiveMonthly = getEffectiveMonthlyPrice(tier, interval);
  const yearlySavings = getYearlySavings(tier);
  const monthly = PLANS[tier].monthlyPrice;
  const accentClass = accent === "accent" ? "text-accent" : "text-primary";

  if (interval === "month") {
    return (
      <>
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-4xl font-bold">{formatEUR(monthly)}</span>
          <span className="text-sm text-muted-foreground">/ mois</span>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="flex items-baseline justify-center gap-1">
        <span className="text-4xl font-bold">{formatEUR(total)}</span>
        <span className="text-sm text-muted-foreground">/ an</span>
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        Soit {formatEUR(effectiveMonthly)}/mois · facturé annuellement
      </p>
      <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-green-500/10 px-3 py-1">
        <span className="text-xs font-bold text-green-600">
          −20% · économisez {formatEUR(yearlySavings, { showCents: false })}/an
        </span>
      </div>
      <p className={`text-xs ${accentClass} font-medium mt-1`}>≈ 2 mois offerts</p>
    </>
  );
};

export const Pricing = ({ pricingNote, comparison = defaultComparison }: PricingProps) => {
  const navigate = useNavigate();
  const [interval, setInterval] = useState<BillingInterval>("month");

  const handleCheckout = (tier: PlanTier) => {

    const planKey = getPlanKey(tier, interval);
    const price = getTotalPrice(tier, interval);
    trackInitiateCheckout({
      content_ids: [planKey],
      content_type: "product",
      currency: "EUR",
      value: price,
      num_items: 1,
    });
    trackPinterestCheckout({
      value: price,
      currency: "EUR",
      order_quantity: 1,
      product_ids: [planKey],
    });
    navigate(`/auth/signup?plan=${planKey}`);
  };

  return (
    <section id="tarifs" className="py-16 bg-gradient-to-b from-background to-secondary/20">
      <div className="container">
        <div className="text-center mb-10 animate-fade-in">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Choisis ton niveau de confort nutritionnel</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-2">
            Plus tu automatises, plus tu gagnes du temps. Les crédits déclenchent les actions IA.
          </p>
          <p className="text-sm text-muted-foreground">
            Essai gratuit 7 jours avec 11 crédits offerts, sans carte bancaire. Prix TTC. Sans
            engagement.
          </p>
        </div>

        {/* Billing interval toggle */}
        <div className="flex justify-center mb-10">
          <BillingToggle value={interval} onChange={setInterval} />
        </div>

        {/* Sans vs Avec comparison bar */}
        <div className="max-w-4xl mx-auto mb-12 rounded-2xl border border-border bg-muted/30 p-6 md:p-8">
          <div className="grid md:grid-cols-[1fr_auto_1fr] gap-6 md:gap-0">
            <div className="space-y-3 md:pr-8">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Sans NutriZen</p>
              {comparison.without.map((line) => (
                <div key={line} className="flex items-start gap-2">
                  <X className="w-4 h-4 text-destructive/60 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-muted-foreground">{line}</span>
                </div>
              ))}
            </div>

            <div className="hidden md:flex flex-col items-center justify-center">
              <div className="w-px h-full bg-border relative">
                <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-muted/80 border border-border rounded-full px-2.5 py-1 text-xs font-bold text-muted-foreground">
                  VS
                </span>
              </div>
            </div>
            <div className="md:hidden flex items-center justify-center">
              <span className="bg-muted/80 border border-border rounded-full px-3 py-1 text-xs font-bold text-muted-foreground">
                VS
              </span>
            </div>

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

          {/* ESSAI GRATUIT */}
          <Card className="p-6 md:p-8 relative border-2 border-green-500/40 hover:border-green-500/70 transition-colors">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge className="bg-green-600 text-white text-xs font-bold">
                <Sparkles className="w-3 h-3 mr-1" />
                {TRIAL.days} jours offerts
              </Badge>
            </div>
            <div className="text-center mb-6 pt-4">
              <h3 className="text-2xl font-bold mb-1">Je teste</h3>
              <p className="text-sm text-muted-foreground italic mb-3">
                Découvre NutriZen sans rien payer.
              </p>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-bold">0 €</span>
                <span className="text-sm text-muted-foreground">/ {TRIAL.days} jours</span>
              </div>
              <p className="text-sm text-green-600 font-medium mt-3">
                {TRIAL.credits} crédits offerts
              </p>
            </div>
            <div className="space-y-3 mb-8">
              {[
                `${TRIAL.days} jours d'accès complet`,
                `${TRIAL.credits} crédits offerts à l'inscription`,
                'Aucune carte bancaire demandée',
                'Passe à un plan payant quand tu veux',
              ].map((f) => (
                <div key={f} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{f}</span>
                </div>
              ))}
            </div>
            <Button
              onClick={() => navigate('/auth/signup')}
              variant="outline"
              className="w-full border-green-500 text-green-600 hover:bg-green-500/10"
              size="lg"
            >
              Démarrer l'essai gratuit
            </Button>
          </Card>

          {/* STARTER */}
          <Card className="p-6 md:p-8 relative border-2 border-primary/20 hover:border-primary/40 transition-colors">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge variant="secondary" className="text-xs font-bold">
                <Star className="w-3 h-3 mr-1" />
                Essentiel
              </Badge>
            </div>
            <div className="text-center mb-6 pt-4">
              <h3 className="text-2xl font-bold mb-1">Je simplifie</h3>
              <p className="text-sm text-muted-foreground italic mb-3">{PLANS.starter.tagline}</p>
              <PriceBlock tier="starter" interval={interval} accent="primary" />
              <p className="text-sm text-primary font-medium mt-3">80 crédits / mois</p>
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
              onClick={() => handleCheckout("starter")}
              variant="outline"
              className="w-full border-primary text-primary hover:bg-primary/10"
              size="lg"
            >
              Choisir Starter {interval === "year" ? "· annuel" : ""}
            </Button>
          </Card>

          {/* PREMIUM */}
          <Card className="p-6 md:p-8 relative border-2 border-accent shadow-lg ring-2 ring-accent/20 hover:ring-accent/40 transition-all">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge className="bg-accent text-white text-xs font-bold flex items-center gap-1">
                <Crown className="w-3 h-3" />
                Recommandé
              </Badge>
            </div>
            <div className="text-center mb-6 pt-4">
              <h3 className="text-2xl font-bold mb-1">Je reprends le contrôle</h3>
              <p className="text-sm text-muted-foreground italic mb-3">{PLANS.premium.tagline}</p>
              <PriceBlock tier="premium" interval={interval} accent="accent" />
              <p className="text-sm text-accent font-medium mt-3">200 crédits / mois</p>
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
              onClick={() => handleCheckout("premium")}
              className="w-full bg-accent hover:bg-accent/90 text-white"
              size="lg"
            >
              Passer en Premium {interval === "year" ? "· annuel" : ""}
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">Annulable à tout moment</p>
          </Card>
        </div>

        <p className="text-center text-sm text-muted-foreground italic mt-10 max-w-xl mx-auto">
          Pour {formatEUR(PLANS.starter.monthlyPrice)}/mois, la plupart de nos utilisateurs économisent plus de{" "}
          <span className="font-bold text-accent not-italic">15×</span> ce montant sur leur budget courses.
        </p>

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
