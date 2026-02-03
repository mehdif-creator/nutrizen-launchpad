import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, Gift, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface Challenge {
  id: string;
  title: string;
  description: string;
  target: number;
  current: number;
  reward: number;
  completed: boolean;
  icon: string;
}

interface WeeklyChallengesProps {
  challenges: Challenge[];
  weekNumber: number;
}

const defaultChallenges: Challenge[] = [
  {
    id: 'new-recipe',
    title: 'Essaie une nouvelle recette',
    description: 'Cuisine une recette que tu n\'as jamais faite',
    target: 1,
    current: 0,
    reward: 20,
    completed: false,
    icon: '🍳',
  },
  {
    id: 'validate-meals',
    title: 'Valide 3 repas',
    description: 'Marque 3 recettes comme "Préparées"',
    target: 3,
    current: 1,
    reward: 15,
    completed: false,
    icon: '✅',
  },
  {
    id: 'rate-recipes',
    title: 'Note 2 recettes',
    description: 'Donne ton avis sur tes recettes',
    target: 2,
    current: 2,
    reward: 10,
    completed: true,
    icon: '⭐',
  },
  {
    id: 'shopping-list',
    title: 'Utilise ta liste de courses',
    description: 'Coche au moins 5 ingrédients',
    target: 5,
    current: 3,
    reward: 10,
    completed: false,
    icon: '🛒',
  },
];

export const WeeklyChallenges = ({ 
  challenges = defaultChallenges, 
  weekNumber = 1 
}: Partial<WeeklyChallengesProps>) => {
  const completedCount = challenges.filter(c => c.completed).length;
  const totalRewards = challenges.filter(c => c.completed).reduce((acc, c) => acc + c.reward, 0);

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" />
            Défis de la semaine
          </h3>
          <p className="text-sm text-muted-foreground">
            Semaine {weekNumber} — {completedCount}/{challenges.length} complétés
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-1">
          <Gift className="w-3 h-3" />
          +{totalRewards} pts gagnés
        </Badge>
      </div>

      {/* Challenges list */}
      <div className="space-y-4">
        {challenges.map((challenge, index) => (
          <motion.div
            key={challenge.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`
              p-4 rounded-lg border transition-all
              ${challenge.completed 
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                : 'bg-card border-border hover:border-primary/30'
              }
            `}
          >
            <div className="flex items-start gap-4">
              {/* Icon & Status */}
              <div className="flex-shrink-0">
                <div className={`
                  w-12 h-12 rounded-full flex items-center justify-center text-2xl
                  ${challenge.completed 
                    ? 'bg-green-100 dark:bg-green-800' 
                    : 'bg-muted'
                  }
                `}>
                  {challenge.icon}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className={`font-medium ${challenge.completed && 'text-green-700 dark:text-green-300'}`}>
                    {challenge.title}
                  </h4>
                  {challenge.completed && (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {challenge.description}
                </p>

                {/* Progress */}
                {!challenge.completed && (
                  <div className="flex items-center gap-3">
                    <Progress 
                      value={(challenge.current / challenge.target) * 100} 
                      className="h-2 flex-1" 
                    />
                    <span className="text-xs font-medium text-muted-foreground">
                      {challenge.current}/{challenge.target}
                    </span>
                  </div>
                )}
              </div>

              {/* Reward */}
              <div className={`
                flex-shrink-0 px-3 py-1 rounded-full text-sm font-medium
                ${challenge.completed 
                  ? 'bg-green-200 dark:bg-green-700 text-green-800 dark:text-green-100' 
                  : 'bg-accent/10 text-accent'
                }
              `}>
                +{challenge.reward} pts
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* All completed bonus */}
      {completedCount === challenges.length && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-6 p-4 bg-gradient-to-r from-accent/20 to-primary/20 rounded-lg text-center"
        >
          <div className="text-3xl mb-2">🎉</div>
          <p className="font-semibold">Tous les défis complétés !</p>
          <p className="text-sm text-muted-foreground">
            Tu as gagné un bonus de +50 points !
          </p>
        </motion.div>
      )}
    </Card>
  );
};