import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Sparkles, Zap, RefreshCw, Camera, Salad } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { FEATURE_COSTS, FEATURE_NAMES } from '@/lib/featureCosts';

interface CreditsEconomyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentBalance?: number;
}

const FREE_FEATURES = [
  { icon: '📋', label: 'Menu hebdomadaire personnalisé' },
  { icon: '🍽️', label: 'Accès à toutes les recettes' },
  { icon: '📊', label: 'Tableau de bord et statistiques' },
  { icon: '💡', label: 'Conseil du jour' },
  { icon: '🛒', label: 'Liste de courses générée' },
];

const PREMIUM_FEATURES = [
  { icon: RefreshCw, label: FEATURE_NAMES.swap, cost: FEATURE_COSTS.swap },
  { icon: Camera, label: FEATURE_NAMES.scan_repas, cost: FEATURE_COSTS.scan_repas },
  { icon: Salad, label: FEATURE_NAMES.inspi_frigo, cost: FEATURE_COSTS.inspi_frigo },
  { icon: Zap, label: FEATURE_NAMES.substitutions, cost: FEATURE_COSTS.substitutions },
];

export function CreditsEconomyModal({
  open,
  onOpenChange,
  currentBalance = 0,
}: CreditsEconomyModalProps) {
  const navigate = useNavigate();

  const handleBuyCredits = () => {
    onOpenChange(false);
    navigate('/credits');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-primary" />
            Crédits Zen – Comment ça marche ?
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current balance */}
          <Card className="p-4 bg-primary/5 border-primary/20">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Votre solde actuel</span>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-xl font-bold text-primary">{currentBalance}</span>
                <span className="text-sm text-muted-foreground">crédits</span>
              </div>
            </div>
          </Card>

          {/* Free features */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              Gratuit et illimité
            </h3>
            <div className="space-y-2">
              {FREE_FEATURES.map((feature, idx) => (
                <div key={idx} className="flex items-center gap-3 text-sm">
                  <span className="text-lg">{feature.icon}</span>
                  <span>{feature.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Premium features */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Fonctionnalités premium (Crédits Zen)
            </h3>
            <div className="space-y-2">
              {PREMIUM_FEATURES.map((feature, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <feature.icon className="h-4 w-4 text-primary" />
                    <span>{feature.label}</span>
                  </div>
                  <Badge variant="secondary">
                    {feature.cost} crédit{feature.cost > 1 ? 's' : ''}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <Button onClick={handleBuyCredits} className="w-full gap-2">
            <Sparkles className="h-4 w-4" />
            Acheter des Crédits Zen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
