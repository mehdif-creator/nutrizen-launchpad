import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Sparkles, Shield, Zap, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useCreditPacks } from '@/hooks/useCreditPacks';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const FEATURES_COST = [
  { feature: 'Changer une recette (swap)', cost: 1 },
  { feature: 'InspiFrigo - Recettes depuis ton frigo', cost: 1 },
  { feature: 'ScanRepas - Analyse de tes repas', cost: 1 },
  { feature: 'Génération menu hebdomadaire', cost: 7 },
];

const FAQ_ITEMS = [
  {
    question: "Comment fonctionnent les Crédits Zen ?",
    answer: "Les Crédits Zen te permettent d'accéder aux fonctionnalités premium de NutriZen. Chaque action (swap de recette, InspiFrigo, ScanRepas) consomme un crédit. Les crédits achetés n'expirent jamais et sont utilisés en dernier, après tes crédits mensuels si tu as un abonnement."
  },
  {
    question: "Les crédits expirent-ils ?",
    answer: "Non ! Les crédits achetés sont valables à vie. Ils sont ajoutés à ton solde permanent (lifetime) et ne sont jamais perdus."
  },
  {
    question: "Comment sont utilisés mes crédits ?",
    answer: "Lorsque tu utilises une fonctionnalité payante, on débite d'abord tes crédits d'abonnement (mensuels), puis tes crédits achetés. Ainsi, tes crédits permanents durent le plus longtemps possible."
  },
  {
    question: "Puis-je me faire rembourser ?",
    answer: "Oui, nous offrons une garantie satisfait ou remboursé de 30 jours sur les packs non utilisés. Contacte notre support pour toute demande."
  },
  {
    question: "L'accès de base est-il gratuit ?",
    answer: "Oui ! Tu peux accéder gratuitement aux menus hebdomadaires, recettes et liste de courses. Les crédits débloquent les options avancées comme les swaps et les analyses IA."
  },
];

export default function CreditsPage() {
  const { packs, loading, formatPrice, getPricePerCredit } = useCreditPacks();
  const { user, session } = useAuth();
  const [purchaseLoading, setPurchaseLoading] = useState<string | null>(null);

  const handlePurchase = async (packId: string) => {
    if (!user || !session) {
      toast.error('Tu dois être connecté pour acheter des crédits');
      return;
    }

    setPurchaseLoading(packId);
    
    try {
      const { data, error } = await supabase.functions.invoke('create-credits-checkout', {
        body: { pack_id: packId },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Checkout error:', error);
        toast.error('Erreur lors de la création de la session de paiement');
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      } else {
        toast.error('URL de paiement non reçue');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast.error('Erreur lors de la création de la session de paiement');
    } finally {
      setPurchaseLoading(null);
    }
  };

  const getPopularPack = () => {
    // Pack M is most popular (best value)
    return 'pack_m';
  };

  const getSavingsPercent = (pack: typeof packs[0]) => {
    if (pack.id === 'pack_s') return 0;
    const basePrice = 499 / 50; // Pack S price per credit
    const packPrice = pack.price_cents / pack.credits;
    return Math.round((1 - packPrice / basePrice) * 100);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/20">
      <Header onCtaClick={() => {}} />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-16 px-4 text-center">
          <div className="container max-w-4xl mx-auto">
            <Badge variant="secondary" className="mb-4">
              <Sparkles className="w-3 h-3 mr-1" />
              Paiement unique • Sans abonnement
            </Badge>
            
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Débloquez les options à la carte avec des{' '}
              <span className="text-primary">Crédits Zen</span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              L'accès de base NutriZen est gratuit. Les Crédits Zen débloquent les fonctionnalités premium — sans abonnement, sans engagement.
            </p>
            
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-600" />
                <span>Paiement sécurisé Stripe</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-600" />
                <span>Crédits activés instantanément</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-primary" />
                <span>Garantie 30 jours</span>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="py-12 px-4">
          <div className="container max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {packs.map((pack) => {
                const isPopular = pack.id === getPopularPack();
                const savings = getSavingsPercent(pack);
                
                return (
                  <Card 
                    key={pack.id}
                    className={`relative p-6 flex flex-col ${
                      isPopular ? 'border-primary shadow-lg ring-2 ring-primary/20' : ''
                    }`}
                  >
                    {isPopular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-primary text-primary-foreground">
                          Le plus populaire
                        </Badge>
                      </div>
                    )}
                    
                    {savings > 0 && (
                      <Badge variant="secondary" className="absolute top-4 right-4 text-green-600">
                        -{savings}%
                      </Badge>
                    )}
                    
                    <div className="mb-4">
                      <h3 className="text-xl font-bold">{pack.name}</h3>
                      <p className="text-3xl font-bold text-primary mt-2">
                        {pack.credits}
                        <span className="text-base font-normal text-muted-foreground ml-1">crédits</span>
                      </p>
                    </div>
                    
                    <div className="mb-6">
                      <p className="text-2xl font-bold">{formatPrice(pack.price_cents)}</p>
                      <p className="text-sm text-muted-foreground">
                        Soit {getPricePerCredit(pack)}€ / crédit
                      </p>
                    </div>
                    
                    <div className="space-y-2 mb-6 flex-1">
                      <div className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-primary" />
                        <span>Crédits non expirants</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-primary" />
                        <span>Utilisables immédiatement</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-primary" />
                        <span>Paiement unique</span>
                      </div>
                    </div>
                    
                    <Button
                      onClick={() => handlePurchase(pack.id)}
                      disabled={purchaseLoading === pack.id || loading}
                      className={isPopular ? 'bg-primary hover:bg-primary/90' : ''}
                      variant={isPopular ? 'default' : 'outline'}
                    >
                      {purchaseLoading === pack.id ? 'Chargement...' : 'Acheter'}
                    </Button>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="container max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
              Comment ça marche ?
            </h2>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <span className="text-xl font-bold text-primary">1</span>
                </div>
                <h3 className="font-semibold mb-2">Choisis ton pack</h3>
                <p className="text-sm text-muted-foreground">
                  Sélectionne le pack qui correspond à tes besoins. Plus le pack est grand, plus le prix par crédit est avantageux.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <span className="text-xl font-bold text-primary">2</span>
                </div>
                <h3 className="font-semibold mb-2">Paie en toute sécurité</h3>
                <p className="text-sm text-muted-foreground">
                  Paiement sécurisé par Stripe. Tes crédits sont ajoutés instantanément à ton compte.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <span className="text-xl font-bold text-primary">3</span>
                </div>
                <h3 className="font-semibold mb-2">Utilise tes crédits</h3>
                <p className="text-sm text-muted-foreground">
                  Débourse tes crédits pour accéder aux fonctionnalités premium quand tu le souhaites.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Features cost table */}
        <section className="py-16 px-4">
          <div className="container max-w-2xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
              Coût des fonctionnalités
            </h2>
            
            <Card className="overflow-hidden">
              <div className="divide-y">
                {FEATURES_COST.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4">
                    <span>{item.feature}</span>
                    <Badge variant="secondary">
                      {item.cost} crédit{item.cost > 1 ? 's' : ''}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
            
            <p className="text-center text-sm text-muted-foreground mt-4">
              L'accès aux menus, recettes et liste de courses reste gratuit et illimité.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="container max-w-2xl mx-auto">
            <div className="flex items-center justify-center gap-2 mb-8">
              <HelpCircle className="w-6 h-6 text-primary" />
              <h2 className="text-2xl md:text-3xl font-bold text-center">
                Questions fréquentes
              </h2>
            </div>
            
            <div className="space-y-4">
              {FAQ_ITEMS.map((item, index) => (
                <FAQItem key={index} question={item.question} answer={item.answer} />
              ))}
            </div>
          </div>
        </section>

        {/* Trust Section */}
        <section className="py-12 px-4">
          <div className="container max-w-4xl mx-auto text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Shield className="w-8 h-8 text-green-600" />
              <span className="text-lg font-semibold">Paiement 100% sécurisé par Stripe</span>
            </div>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto">
              Vos informations bancaires ne transitent jamais par nos serveurs. 
              Stripe, leader mondial du paiement en ligne, garantit la sécurité de vos transactions.
            </p>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className="w-full p-4 flex items-center justify-between text-left hover:bg-muted/50 transition-colors">
            <span className="font-medium">{question}</span>
            {isOpen ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 text-sm text-muted-foreground">
            {answer}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
