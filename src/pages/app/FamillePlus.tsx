import { AppHeader } from '@/components/app/AppHeader';
import { AppFooter } from '@/components/app/AppFooter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Check, 
  X, 
  Sparkles, 
  Shield, 
  Users, 
  Zap, 
  Camera, 
  RefreshCw,
  ShoppingBag,
  Clock,
  Crown,
  Heart
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

interface FeatureComparison {
  name: string;
  free: boolean | string;
  premium: boolean | string;
  highlight?: boolean;
}

const features: FeatureComparison[] = [
  { name: 'Menu hebdomadaire personnalisé', free: true, premium: true },
  { name: 'Accès à +500 recettes', free: true, premium: true },
  { name: 'Liste de courses intelligente', free: true, premium: true },
  { name: 'Tableau de bord & stats', free: true, premium: true },
  { name: 'Historique des menus', free: true, premium: true },
  { name: 'Régénération de menu illimitée', free: '1/semaine', premium: 'Illimité', highlight: true },
  { name: 'Filtres avancés (batch, 15min, enfants)', free: false, premium: true, highlight: true },
  { name: 'ScanRepas — Analyse photo nutritionnelle', free: 'Limité', premium: 'Illimité', highlight: true },
  { name: 'InspiFrigo — Recettes depuis ton frigo', free: 'Limité', premium: 'Illimité', highlight: true },
  { name: 'Substitutions d\'ingrédients', free: 'Limité', premium: 'Illimité' },
  { name: 'Mode "Semaine Chargée"', free: false, premium: true, highlight: true },
  { name: 'Liste courses optimisée par rayon', free: false, premium: true },
  { name: 'Support prioritaire', free: false, premium: true },
];

const premiumBenefits = [
  {
    icon: <Clock className="w-5 h-5" />,
    title: 'Gagne 5h/semaine',
    description: 'Plus de charge mentale sur les repas',
  },
  {
    icon: <Users className="w-5 h-5" />,
    title: 'Toute la famille satisfaite',
    description: 'Filtres "enfants" et contraintes multiples',
  },
  {
    icon: <Camera className="w-5 h-5" />,
    title: 'ScanRepas illimité',
    description: 'Analyse tes repas en un clic',
  },
  {
    icon: <RefreshCw className="w-5 h-5" />,
    title: 'Régénère à volonté',
    description: 'Change de menu quand tu veux',
  },
];

export default function FamillePlus() {
  const navigate = useNavigate();

  const handleSubscribe = () => {
    // TODO: Redirect to Stripe checkout for Famille+ subscription
    navigate('/credits');
  };

  const handleFreePlan = () => {
    navigate('/auth/signup');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-16 bg-gradient-to-br from-primary/5 via-background to-accent/5">
          <div className="container">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center max-w-3xl mx-auto"
            >
              <Badge className="mb-4 bg-gradient-to-r from-primary to-accent text-white">
                <Crown className="w-3 h-3 mr-1" />
                Offre Premium
              </Badge>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                NutriZen <span className="text-primary">Famille+</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-6">
                Pour les familles qui veulent passer au niveau supérieur : 
                <strong> moins de stress, plus de plaisir.</strong>
              </p>
              
              {/* Price */}
              <div className="inline-flex items-baseline gap-2 p-6 bg-card rounded-2xl shadow-lg border mb-8">
                <span className="text-5xl font-bold">15€</span>
                <span className="text-xl text-muted-foreground">/mois</span>
              </div>
              
              <p className="text-sm text-muted-foreground mb-8">
                Soit <strong>moins de 50 centimes par jour</strong> pour ne plus jamais te demander "on mange quoi?"
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  onClick={handleSubscribe}
                  size="lg"
                  className="bg-gradient-to-r from-primary to-accent text-white hover:scale-[1.02] shadow-glow text-lg px-8 py-6"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Passer à Famille+
                </Button>
                <Button
                  onClick={handleFreePlan}
                  variant="outline"
                  size="lg"
                  className="text-lg px-8 py-6"
                >
                  Rester gratuit
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Benefits Grid */}
        <section className="py-16">
          <div className="container">
            <h2 className="text-2xl font-bold text-center mb-10">
              Pourquoi Famille+ change tout
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {premiumBenefits.map((benefit, index) => (
                <motion.div
                  key={benefit.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="p-6 text-center h-full hover:shadow-lg transition-shadow">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 text-primary">
                      {benefit.icon}
                    </div>
                    <h3 className="font-semibold mb-2">{benefit.title}</h3>
                    <p className="text-sm text-muted-foreground">{benefit.description}</p>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Comparison Table */}
        <section className="py-16 bg-muted/30">
          <div className="container">
            <h2 className="text-2xl font-bold text-center mb-10">
              Gratuit vs Famille+
            </h2>
            
            <Card className="max-w-4xl mx-auto overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-3 bg-muted/50 p-4 font-semibold text-center">
                <div className="text-left pl-4">Fonctionnalité</div>
                <div>Gratuit</div>
                <div className="flex items-center justify-center gap-2">
                  <Crown className="w-4 h-4 text-accent" />
                  Famille+
                </div>
              </div>
              
              {/* Features */}
              <div className="divide-y">
                {features.map((feature) => (
                  <div
                    key={feature.name}
                    className={`grid grid-cols-3 p-4 ${feature.highlight ? 'bg-accent/5' : ''}`}
                  >
                    <div className="text-sm flex items-center gap-2">
                      {feature.highlight && <Zap className="w-4 h-4 text-accent" />}
                      {feature.name}
                    </div>
                    <div className="text-center">
                      {typeof feature.free === 'boolean' ? (
                        feature.free ? (
                          <Check className="w-5 h-5 text-green-600 mx-auto" />
                        ) : (
                          <X className="w-5 h-5 text-muted-foreground mx-auto" />
                        )
                      ) : (
                        <span className="text-sm text-muted-foreground">{feature.free}</span>
                      )}
                    </div>
                    <div className="text-center">
                      {typeof feature.premium === 'boolean' ? (
                        feature.premium ? (
                          <Check className="w-5 h-5 text-green-600 mx-auto" />
                        ) : (
                          <X className="w-5 h-5 text-muted-foreground mx-auto" />
                        )
                      ) : (
                        <span className="text-sm font-medium text-primary">{feature.premium}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </section>

        {/* Value Proposition */}
        <section className="py-16">
          <div className="container">
            <Card className="max-w-3xl mx-auto p-8 md:p-12 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
              <div className="text-center">
                <Heart className="w-12 h-12 text-primary mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-4">
                  Ce n'est pas 15€ pour des recettes.
                </h2>
                <p className="text-lg text-muted-foreground mb-6">
                  C'est <strong>15€ pour ne plus jamais stresser</strong> sur les repas.
                  <br />
                  C'est 4 cafés pour retrouver ta sérénité.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    onClick={handleSubscribe}
                    size="lg"
                    className="bg-gradient-to-r from-primary to-accent text-white hover:scale-[1.02] shadow-glow"
                  >
                    Commencer avec Famille+
                  </Button>
                </div>

                <div className="flex items-center justify-center gap-6 mt-8 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-green-600" />
                    <span>Annulation facile</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-green-600" />
                    <span>Paiement sécurisé Stripe</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* FAQ Mini */}
        <section className="py-16 bg-muted/30">
          <div className="container max-w-2xl">
            <h2 className="text-2xl font-bold text-center mb-8">Questions fréquentes</h2>
            <div className="space-y-4">
              <Card className="p-6">
                <h3 className="font-semibold mb-2">Puis-je annuler à tout moment ?</h3>
                <p className="text-sm text-muted-foreground">
                  Oui ! Tu peux annuler ton abonnement Famille+ quand tu veux, directement depuis ton compte. 
                  Tu garderas accès jusqu'à la fin de ta période payée.
                </p>
              </Card>
              <Card className="p-6">
                <h3 className="font-semibold mb-2">Et si je préfère rester gratuit ?</h3>
                <p className="text-sm text-muted-foreground">
                  Aucun problème ! Le plan gratuit reste complet et sans limite de temps. 
                  Tu peux aussi acheter des Crédits Zen ponctuels pour les fonctionnalités premium.
                </p>
              </Card>
              <Card className="p-6">
                <h3 className="font-semibold mb-2">Y a-t-il un engagement ?</h3>
                <p className="text-sm text-muted-foreground">
                  Non, aucun engagement. C'est un abonnement mensuel sans durée minimale.
                </p>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <AppFooter />
    </div>
  );
}