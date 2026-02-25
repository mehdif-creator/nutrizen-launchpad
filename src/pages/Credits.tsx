import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Sparkles, Shield, Zap, HelpCircle, ChevronDown, ChevronUp, LogIn, Crown } from 'lucide-react';
import { useCreditPacks } from '@/hooks/useCreditPacks';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Header } from '@/components/landing/Header';
import { Footer } from '@/components/landing/Footer';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { createLogger } from '@/lib/logger';
import { CREDIT_COSTS_DISPLAY } from '@/lib/featureCosts';

const logger = createLogger('Credits');

const FAQ_ITEMS = [
  {
    question: "Comment fonctionnent les Crédits Zen ?",
    answer: "Les Crédits Zen te permettent de déclencher des actions IA : menus, scans, substitutions. Chaque action a un coût en crédits. Les crédits achetés n'expirent jamais et sont utilisés après tes crédits d'abonnement."
  },
  {
    question: "Les crédits achetés expirent-ils ?",
    answer: "Non ! Les crédits achetés (top-ups) sont valables à vie. Ils sont ajoutés à ton solde permanent."
  },
  {
    question: "Suis-je abonné Premium ? Ai-je la réduction -10% ?",
    answer: "Si tu es abonné Premium, la réduction de 10% est automatiquement appliquée lors du paiement de tes packs de crédits."
  },
  {
    question: "Puis-je me faire rembourser ?",
    answer: "Oui, nous offrons une garantie satisfait ou remboursé de 30 jours sur les packs non utilisés. Contacte notre support."
  },
];

export default function CreditsPage() {
  const { packs, loading, formatPrice, getPricePerCredit } = useCreditPacks();
  const { user, session, subscription, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [purchaseLoading, setPurchaseLoading] = useState<string | null>(null);

  const isPremium = subscription?.plan === 'premium' || subscription?.plan === 'NutriZen Premium';

  const handlePurchase = async (packId: string) => {
    if (!user || !session) {
      toast.info('Connecte-toi pour acheter des crédits');
      navigate(`/auth/login?redirect=${encodeURIComponent('/credits')}`);
      return;
    }

    setPurchaseLoading(packId);
    logger.info('Starting checkout', { packId, userId: user.id.substring(0, 8) });
    
    try {
      const { data, error } = await supabase.functions.invoke('create-credits-checkout', {
        body: { pack_id: packId },
      });

      if (error) {
        logger.error('Checkout creation failed', error);
        toast.error('Erreur lors de la création du paiement. Réessaie.');
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      } else {
        toast.error('URL de paiement non reçue. Réessaie.');
      }
    } catch (error) {
      logger.error('Unexpected error', error instanceof Error ? error : new Error(String(error)));
      toast.error('Erreur réseau. Vérifie ta connexion.');
    } finally {
      setPurchaseLoading(null);
    }
  };

  const getDiscountedPrice = (priceCents: number) => {
    if (!isPremium) return priceCents;
    return Math.round(priceCents * 0.9);
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
              Packs de crédits • Paiement unique
            </Badge>
            
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Recharge tes{' '}
              <span className="text-primary">Crédits Zen</span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-4 max-w-2xl mx-auto">
              Besoin de plus de crédits ? Achète un pack à tout moment. Les crédits achetés n'expirent jamais.
            </p>

            {isPremium && (
              <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-full px-4 py-2 mb-4">
                <Crown className="w-4 h-4 text-accent" />
                <span className="text-sm font-medium text-accent">Premium : -10% sur tous les packs</span>
              </div>
            )}
            
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
                <span>Prix TTC</span>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="py-12 px-4">
          <div className="container max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {packs.map((pack) => {
                const isPopular = pack.id === 'topup_80';
                const displayPrice = getDiscountedPrice(pack.price_cents);
                const originalPrice = pack.price_cents;
                const hasDiscount = isPremium && displayPrice < originalPrice;
                
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
                    
                    <div className="mb-4">
                      <h3 className="text-xl font-bold">{pack.name}</h3>
                      <p className="text-3xl font-bold text-primary mt-2">
                        {pack.credits}
                        <span className="text-base font-normal text-muted-foreground ml-1">crédits</span>
                      </p>
                    </div>
                    
                    <div className="mb-6">
                      {hasDiscount && (
                        <p className="text-sm text-muted-foreground line-through">
                          {formatPrice(originalPrice)}
                        </p>
                      )}
                      <p className="text-2xl font-bold">{formatPrice(displayPrice)} TTC</p>
                      <p className="text-sm text-muted-foreground">
                        Soit {(displayPrice / pack.credits / 100).toFixed(3)}€ / crédit
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
                      disabled={purchaseLoading === pack.id || loading || authLoading}
                      className={isPopular ? 'bg-primary hover:bg-primary/90' : ''}
                      variant={isPopular ? 'default' : 'outline'}
                    >
                      {purchaseLoading === pack.id ? (
                        'Redirection…'
                      ) : !user ? (
                        <><LogIn className="w-4 h-4 mr-1" /> Se connecter</>
                      ) : (
                        'Acheter'
                      )}
                    </Button>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* Features cost table */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="container max-w-2xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
              Coût des actions IA
            </h2>
            
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
        </section>

        {/* FAQ */}
        <section className="py-16 px-4">
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
              Vos informations bancaires ne transitent jamais par nos serveurs. Prix TTC.
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
