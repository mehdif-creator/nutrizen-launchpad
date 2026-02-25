import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Zap, Shield, ChefHat, Crown, Star, HelpCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { CREDIT_COSTS_DISPLAY } from "@/lib/featureCosts";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";

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
          {/* FREE Card */}
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

          {/* STARTER Card */}
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
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-bold">12,99€</span>
                <span className="text-sm text-muted-foreground">/ mois TTC</span>
              </div>
              <p className="text-sm text-primary font-medium mt-2">80 crédits / mois</p>
            </div>

            <div className="space-y-3 mb-6">
              {[
                "Rollover : jusqu'à 20 crédits reportables",
                "Menus + liste de courses, en continu",
                "Idéal si tu utilises surtout la génération de menus",
              ].map((f) => (
                <div key={f} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{f}</span>
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground mb-2">
              Starter = menus principalement. Premium = menus + scans + optimisation.
            </p>
            <p className="text-xs text-muted-foreground mb-6">
              Équivalent : environ 10–13 semaines en "1 repas/jour" (selon ajustements)
            </p>

            <Button
              onClick={() => handleCheckout('starter')}
              variant="outline"
              className="w-full border-primary text-primary hover:bg-primary/10"
              size="lg"
            >
              Choisir Starter
            </Button>
          </Card>

          {/* PREMIUM Card (dominant) */}
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
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-bold">19,99€</span>
                <span className="text-sm text-muted-foreground">/ mois TTC</span>
              </div>
              <p className="text-sm text-accent font-medium mt-2">200 crédits / mois</p>
            </div>

            <div className="space-y-3 mb-6">
              {[
                "Rollover : jusqu'à 80 crédits reportables",
                "Pensé pour menus + scans + ajustements fréquents",
                "Priorité génération (file plus rapide)",
                "-10% sur les packs de crédits",
              ].map((f) => (
                <div key={f} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{f}</span>
                </div>
              ))}
            </div>

            <div className="bg-accent/5 rounded-lg p-3 mb-4">
              <p className="text-xs text-muted-foreground">
                <strong>Scénario réel :</strong> menus + 2 scans + ajustements / semaine, sans compter.
              </p>
            </div>

            <p className="text-xs text-muted-foreground mb-4">
              Pour +7€, tu passes à 2,5× plus de crédits + rollover 4× + avantages Premium
            </p>

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

        {/* Credits = AI actions block */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h3 className="text-xl font-bold text-center mb-6 flex items-center justify-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Les crédits = actions IA (simple, transparent)
          </h3>
          <Card className="overflow-hidden">
            <div className="divide-y">
              {CREDIT_COSTS_DISPLAY.map((item) => (
                <div key={item.label} className="flex items-center justify-between p-4">
                  <span className="text-sm">{item.label}</span>
                  <Badge variant="secondary">
                    {item.cost} crédit{item.cost > 1 ? 's' : ''}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* FAQ */}
        <div className="mt-16 max-w-2xl mx-auto">
          <div className="flex items-center justify-center gap-2 mb-8">
            <HelpCircle className="w-6 h-6 text-primary" />
            <h3 className="text-xl font-bold">Questions fréquentes</h3>
          </div>
          <div className="space-y-3">
            <FAQItem
              q="Puis-je annuler à tout moment ?"
              a="Oui, tu peux annuler ton abonnement à tout moment. L'accès reste actif jusqu'à la fin de la période payée."
            />
            <FAQItem
              q="Comment fonctionne le rollover ?"
              a="Les crédits non utilisés sont reportés au mois suivant, dans la limite du cap de rollover (20 pour Starter, 80 pour Premium). Les crédits au-delà du cap sont perdus."
            />
            <FAQItem
              q="Les crédits offerts (bienvenue) sont-ils reconductibles ?"
              a="Non, les 14 crédits de bienvenue sont offerts une seule fois. Ils n'expirent pas et restent sur ton compte jusqu'à utilisation."
            />
            <FAQItem
              q="Que se passe-t-il si je passe de Starter à Premium ?"
              a="L'upgrade est immédiat. Tu reçois un complément de crédits proratisé pour le reste du mois en cours. Pas de double facturation."
            />
            <FAQItem
              q="Et si je downgrade de Premium à Starter ?"
              a="Le downgrade prend effet à la fin de la période payée. Tes crédits restants ne changent pas jusqu'au prochain cycle."
            />
            <FAQItem
              q="Puis-je acheter des crédits en plus de mon abonnement ?"
              a="Oui ! Les packs de crédits (top-ups) sont disponibles à tout moment. Les abonnés Premium bénéficient de -10% sur tous les packs."
            />
          </div>
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

function FAQItem({ q, a }: { q: string; a: string }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className="w-full p-4 flex items-center justify-between text-left hover:bg-muted/50 transition-colors">
            <span className="font-medium text-sm">{q}</span>
            {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 text-sm text-muted-foreground">{a}</div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
