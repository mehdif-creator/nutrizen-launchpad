import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, ShoppingCart, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function BuyCreditsSection() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleBuyCredits = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.info('Connecte-toi pour acheter des crédits');
        navigate('/credits');
        return;
      }

      console.log('[BuyCredits] Creating checkout for pack_m');
      const { data, error } = await supabase.functions.invoke('create-credits-checkout', {
        body: { pack_id: 'pack_m' },
      });

      if (error) {
        console.error('[BuyCredits] Checkout error:', error);
        toast.error('Erreur lors de la création du paiement. Réessaie.');
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      } else {
        console.error('[BuyCredits] No URL in response:', data);
        toast.error('URL de paiement non reçue. Réessaie.');
      }
    } catch (error) {
      console.error('[BuyCredits] Unexpected error:', error);
      toast.error('Erreur réseau. Vérifie ta connexion.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <div className="space-y-4">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-full bg-primary/20">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold mb-2">Crédits Zen x15</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Des crédits supplémentaires qui ne périment jamais ! Idéal pour utiliser tes fonctionnalités préférées sans limite.
            </p>
            
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-primary" />
                <span>15 Crédits Zen non expirants</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-primary" />
                <span>Utilisables sur swap, InspiFrigo et ScanRepas</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-primary" />
                <span>Valables à vie sur ton compte</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-primary">4,99 €</p>
                <p className="text-xs text-muted-foreground">Paiement unique</p>
              </div>
              <Button
                size="lg"
                onClick={handleBuyCredits}
                disabled={loading}
                className="gap-2"
              >
                <ShoppingCart className="h-5 w-5" />
                {loading ? 'Chargement...' : 'Acheter maintenant'}
              </Button>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-border/50">
          <p className="text-xs text-muted-foreground">
            💡 <strong>Astuce :</strong> Tes crédits achetés sont toujours utilisés en dernier, après tes crédits d'abonnement mensuels. Ainsi, tu maximises la durée de vie de tes crédits non expirants !
          </p>
        </div>
      </div>
    </Card>
  );
}
