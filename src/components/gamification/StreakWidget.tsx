import { Card } from '@/components/ui/card';
import { Flame, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';

interface StreakWidgetProps {
  currentStreak: number;
  longestStreak: number;
}

export function StreakWidget({ currentStreak, longestStreak }: StreakWidgetProps) {
  const daysUntil7 = Math.max(0, 7 - currentStreak);
  const daysUntil30 = Math.max(0, 30 - currentStreak);

  return (
    <Card className="p-6 bg-gradient-to-br from-orange-500/10 to-red-500/10">
      <div className="flex items-center gap-4">
        {/* Flame animation */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 5, -5, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatType: 'reverse',
          }}
          className="relative"
        >
          <Flame className="h-16 w-16 text-orange-500" />
          <motion.div
            className="absolute inset-0 bg-orange-500 blur-xl opacity-50"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatType: 'reverse',
            }}
          />
        </motion.div>

        <div className="flex-1">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-4xl font-bold">{currentStreak}</span>
            <span className="text-muted-foreground">jours de série</span>
          </div>

          {/* Next milestone */}
          {currentStreak < 7 && (
            <p className="text-sm text-muted-foreground">
              ⚡ Plus que <span className="font-semibold text-foreground">{daysUntil7} jours</span> pour +1 crédit
            </p>
          )}
          {currentStreak >= 7 && currentStreak < 30 && (
            <p className="text-sm text-muted-foreground">
              🔥 Plus que <span className="font-semibold text-foreground">{daysUntil30} jours</span> pour le badge Gold +10pts
            </p>
          )}
          {currentStreak >= 30 && (
            <p className="text-sm text-primary font-semibold">
              🏆 Série incroyable! Continue comme ça!
            </p>
          )}

          {/* Progress bar */}
          <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-orange-500 to-red-500"
              initial={{ width: 0 }}
              animate={{ 
                width: `${Math.min(100, (currentStreak / (currentStreak < 7 ? 7 : 30)) * 100)}%`
              }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Record */}
        <div className="flex flex-col items-center p-3 bg-card rounded-lg border">
          <Trophy className="h-6 w-6 text-yellow-500 mb-1" />
          <span className="text-2xl font-bold">{longestStreak}</span>
          <span className="text-xs text-muted-foreground">Record</span>
        </div>
      </div>
    </Card>
  );
}