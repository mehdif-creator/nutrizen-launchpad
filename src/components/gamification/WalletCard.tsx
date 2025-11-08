import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Coins, Sparkles, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { usePointsToCredits } from '@/hooks/useGamificationDashboard';

interface WalletCardProps {
  points: number;
  credits: number;
  lifetimePoints: number;
  onBuyCredits: () => void;
}

export function WalletCard({ points, credits, lifetimePoints, onBuyCredits }: WalletCardProps) {
  const convertMutation = usePointsToCredits();

  const handleConvert = () => {
    if (points >= 100) {
      convertMutation.mutate(100);
    }
  };

  const progressToNextMilestone = (points % 100) / 100;

  return (
    <Card className="p-6 bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Votre Wallet
          </h2>
          <Button onClick={onBuyCredits} size="sm" variant="outline">
            Acheter des crédits
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Points */}
          <motion.div
            className="p-4 bg-card rounded-lg border"
            whileHover={{ scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              <span className="text-sm text-muted-foreground">Points</span>
            </div>
            <div className="text-3xl font-bold">{points}</div>
            
            {/* Progress to next 100 */}
            <div className="mt-2">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-yellow-500 to-orange-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressToNextMilestone * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {100 - (points % 100)} pts jusqu'au prochain palier
              </p>
            </div>

            {points >= 100 && (
              <Button
                onClick={handleConvert}
                size="sm"
                variant="ghost"
                className="w-full mt-2"
                disabled={convertMutation.isPending}
              >
                Convertir 100 pts → 10 crédits
              </Button>
            )}
          </motion.div>

          {/* Credits */}
          <motion.div
            className="p-4 bg-card rounded-lg border"
            whileHover={{ scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Coins className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground">Crédits</span>
            </div>
            <div className="text-3xl font-bold">{credits}</div>
            <p className="text-xs text-muted-foreground mt-2">
              1 crédit = 1 Swap/Scan/Frigo
            </p>
            <p className="text-xs text-muted-foreground">
              €5 = 15 crédits
            </p>
          </motion.div>
        </div>

        {/* Lifetime stats */}
        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
          <TrendingUp className="h-4 w-4 text-primary" />
          <span className="text-sm text-muted-foreground">
            Total à vie: <span className="font-semibold text-foreground">{lifetimePoints}</span> points gagnés
          </span>
        </div>
      </div>
    </Card>
  );
}