import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Flame, Trophy, Award, Sparkles } from "lucide-react";
import { useGamification } from "@/hooks/useGamification";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

// Animated counter component
function AnimatedCounter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 1000;
    const steps = 30;
    const increment = (value - displayValue) / steps;
    let current = displayValue;
    
    const timer = setInterval(() => {
      current += increment;
      if ((increment > 0 && current >= value) || (increment < 0 && current <= value)) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.round(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <span>
      {displayValue}
      {suffix}
    </span>
  );
}

export function StreakBar() {
  const { user } = useAuth();
  const { gamification, levelName, levelColor } = useGamification(user?.id);
  const { stats } = useDashboardStats(user?.id);
  const [showCelebration, setShowCelebration] = useState(false);

  // Calculate streak progress (assuming goal of 7 days for weekly streak)
  const streakGoal = 7;
  const streakProgress = Math.min((gamification.streak_days / streakGoal) * 100, 100);

  // Show celebration when streak goal is reached
  useEffect(() => {
    if (gamification.streak_days >= streakGoal && streakProgress >= 100) {
      setShowCelebration(true);
      const timer = setTimeout(() => setShowCelebration(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [gamification.streak_days, streakGoal, streakProgress]);

  return (
    <Card className="rounded-2xl border shadow-sm p-4 md:p-6 bg-gradient-to-br from-primary/10 via-background to-accent/10 relative overflow-hidden">
      {/* Celebration particles */}
      <AnimatePresence>
        {showCelebration && (
          <>
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500"
                initial={{
                  x: "50%",
                  y: "50%",
                  scale: 0,
                  opacity: 1,
                }}
                animate={{
                  x: `${50 + (Math.random() - 0.5) * 200}%`,
                  y: `${50 + (Math.random() - 0.5) * 200}%`,
                  scale: [0, 1.5, 0],
                  opacity: [1, 1, 0],
                }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 2,
                  delay: i * 0.05,
                  ease: "easeOut",
                }}
              />
            ))}
          </>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        {/* Série */}
        <motion.div
          className="flex items-center gap-3"
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <motion.div
            className="bg-gradient-to-br from-orange-500 to-red-500 rounded-xl p-3 shadow-lg"
            animate={gamification.streak_days > 0 ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 3 }}
          >
            <Flame className="h-6 w-6 text-white" />
          </motion.div>
          <div>
            <div className="text-2xl font-bold">
              <AnimatedCounter value={gamification.streak_days} suffix="" />
              <span className="text-sm text-muted-foreground ml-1">jours</span>
            </div>
            <div className="text-xs text-muted-foreground">Série actuelle</div>
          </div>
        </motion.div>

        {/* Niveau */}
        <motion.div
          className="flex items-center gap-3"
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <div className={cn("rounded-xl p-3 shadow-lg", 
            levelName === "Bronze" ? "bg-gradient-to-br from-amber-600 to-amber-800" :
            levelName === "Silver" ? "bg-gradient-to-br from-gray-300 to-gray-500" :
            levelName === "Gold" ? "bg-gradient-to-br from-yellow-400 to-yellow-600" :
            "bg-gradient-to-br from-blue-400 to-blue-600"
          )}>
            <Trophy className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="text-xl font-bold">{levelName}</div>
            <div className="text-xs text-muted-foreground">
              <AnimatedCounter value={gamification.points} suffix="" /> points
            </div>
          </div>
        </motion.div>

        {/* Crédits */}
        <motion.div
          className="flex items-center gap-3"
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <motion.div
            className="bg-gradient-to-br from-primary to-primary/80 rounded-xl p-3 shadow-lg"
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 5 }}
          >
            <Sparkles className="h-6 w-6 text-white" />
          </motion.div>
          <div>
            <div className="text-2xl font-bold">
              <AnimatedCounter value={stats.credits_zen} suffix="" />
            </div>
            <div className="text-xs text-muted-foreground">Crédits restants</div>
          </div>
        </motion.div>

        {/* Références */}
        <motion.div
          className="flex items-center gap-3"
          whileHover={{ scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-3 shadow-lg">
            <Award className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="text-2xl font-bold">
              <AnimatedCounter value={stats.references_count} suffix="" />
            </div>
            <div className="text-xs text-muted-foreground">Références</div>
          </div>
        </motion.div>
      </div>

      {/* Streak Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Progression hebdomadaire</span>
          <span className="font-medium text-orange-600 dark:text-orange-500">
            {gamification.streak_days}/{streakGoal} jours
          </span>
        </div>
        <Progress 
          value={streakProgress} 
          className="h-2 bg-muted"
        />
        {gamification.streak_days >= streakGoal && (
          <div className="text-xs text-green-600 dark:text-green-500 font-medium flex items-center gap-1">
            <Flame className="h-3 w-3" />
            Objectif hebdomadaire atteint !
          </div>
        )}
      </div>
    </Card>
  );
}
