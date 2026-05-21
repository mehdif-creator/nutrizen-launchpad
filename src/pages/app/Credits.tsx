import { AppHeader } from '@/components/app/AppHeader';
import { AppFooter } from '@/components/app/AppFooter';
import { MobileBottomNav } from '@/components/app/MobileBottomNav';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Star, History, Info, Check } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCreditPacks } from '@/hooks/useCreditPacks';
import { ZenCreditsDisplay } from '@/components/app/ZenCreditsDisplay';
import { CREDIT_COSTS_DISPLAY } from '@/lib/featureCosts';
import { trackInitiateCheckout } from '@/lib/metaPixel';
import { trackAddToCart as trackPinterestAddToCart } from '@/lib/pinterestPixel';

export default function Credits() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { packs, loading: packsLoading, formatPrice, getPricePerCredit } = useCreditPacks();
  const [buying, setBuying] = useState<string | null>(null);

  const handleBuyPack = async (pack: (typeof packs)[0]) => {
    if (!pack.stripe_price_id) {
      toast({
        title: 'Achat indisponible',
        description: "Ce pack n'est pas encore configuré pour l'achat.",
        variant: 'destructive',
      });
      return;
    }

    setBuying(pack.id);
    try {
      trackInitiateCheckout({
        content_ids: [pack.id],
        content_type: 'product',
        currency: pack.currency?.toUpperCase() || 'EUR',
        value: pack.price_cents / 100,
        num_items: 1,
      });
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { price_id: pack.stripe_price_id, mode: 'payment' },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      toast({
        title: 'Erreur',
        description: 'Impossible de lancer le paiement. Réessaie plus tard.',
        variant: 'destructive',
      });
    } finally {
      setBuying(null);
    }
  };

  // Find the best value pack (highest credits/price ratio)
  const bestValueIdx =
    packs.length > 0
      ? packs.reduce((bestIdx, pack, idx, arr) => {
          const ratio = pack.credits / pack.price_cents;
          const bestRatio = arr[bestIdx].credits / arr[bestIdx].price_cents;
          return ratio > bestRatio ? idx : bestIdx;
        }, 0)
      : -1;

  // Middle pack is "popular"
  const popularIdx = Math.floor(packs.length / 2);

  return (
    <div className="min-h-screen flex flex-col bg-background pb-20 md:pb-0">
      <AppHeader />

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 md:py-10 space-y-8">
        {/* Page header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <Sparkles className="h-7 w-7 text-primary" />
            Acheter des Crédits Zen
          </h1>
          <p className="text-muted-foreground mt-2 text-sm md:text-base">
            Les crédits n'expirent jamais. Utilisables sur swap, InspiFrigo et ScanRepas.
          </p>
        </div>

        {/* Current balance */}
        <ZenCreditsDisplay userId={user?.id} showBuyButton={false} size="md" />

        {/* Packs grid */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Choisis ton pack</h2>
          {packsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-6 animate-pulse">
                  <div className="h-32 bg-muted rounded" />
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {packs.map((pack, idx) => {
                const isPopular = idx === popularIdx;
                const isBestValue = idx === bestValueIdx && bestValueIdx !== popularIdx;

                return (
                  <Card
                    key={pack.id}
                    className={`relative p-6 flex flex-col items-center text-center space-y-4 transition-all hover:shadow-lg ${
                      isPopular ? 'border-primary ring-1 ring-primary/30 scale-[1.02]' : ''
                    }`}
                  >
                    {isPopular && (
                      <Badge className="absolute -top-3 right-3 bg-primary text-primary-foreground">
                        Populaire
                      </Badge>
                    )}
                    {isBestValue && (
                      <Badge className="absolute -top-3 right-3 bg-primary/80 text-primary-foreground">
                        Meilleur prix
                      </Badge>
                    )}

                    <div className="p-3 rounded-full bg-primary/10">
                      <Sparkles className="h-6 w-6 text-primary" />
                    </div>

                    <div>
                      <p className="text-3xl font-bold">{pack.credits}</p>
                      <p className="text-sm text-muted-foreground">crédits</p>
                    </div>

                    <div>
                      <p className="text-xl font-semibold">
                        {formatPrice(pack.price_cents, pack.currency)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {getPricePerCredit(pack)} €/crédit
                      </p>
                    </div>

                    <Button
                      className="w-full"
                      variant={isPopular ? 'default' : 'outline'}
                      disabled={buying !== null}
                      onClick={() => handleBuyPack(pack)}
                    >
                      {buying === pack.id ? 'Redirection…' : 'Acheter'}
                    </Button>
                  </Card>
                );
              })}
            </div>
          )}

          <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5 shrink-0" />
            Tes crédits achetés sont utilisés en dernier, après tes crédits d'abonnement mensuels.
          </p>
        </section>

        {/* Feature costs table */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Coût par fonctionnalité</h2>
          <Card className="divide-y divide-border">
            {CREDIT_COSTS_DISPLAY.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="text-foreground">{item.label}</span>
                <Badge variant="secondary">
                  {item.cost} crédit{item.cost > 1 ? 's' : ''}
                </Badge>
              </div>
            ))}
          </Card>
        </section>
      </main>

      <AppFooter />
      <MobileBottomNav />
    </div>
  );
}
