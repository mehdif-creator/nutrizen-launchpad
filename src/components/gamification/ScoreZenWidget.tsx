import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Flame, TrendingUp, Trophy, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

interface ScoreZenWidgetProps {
  score: number;
  weeklyChange: number;
  level: number;
  levelName: string;
  nextLevelAt: number;
  streak: number;
}

const levelColors: Record<number, string> = {
  1: 'from-slate-400 to-slate-500',
  2: 'from-emerald-400 to-emerald-600',
  3: 'from-blue-400 to-blue-600',
  4: 'from-purple-400 to-purple-600',
};

const levelNames: Record<number, string> = {
  1: 'Apprenti Zen',
  2: 'Cuisinier Serein',
  3: 'Maître Zen',
  4: 'Zen Master',
};

export const ScoreZenWidget = ({
  score,
  weeklyChange,
  level,
  levelName,
  nextLevelAt,
  streak,
}: ScoreZenWidgetProps) => {
  const progressToNext = nextLevelAt > 0 ? (score / nextLevelAt) * 100 : 100;
  const isPositiveChange = weeklyChange >= 0;

  return (
    <Card className="p-6 overflow-hidden relative">
      {/* Background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${levelColors[level] || levelColors[1]} opacity-5`} />
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Score Zen
            </h3>
            <p className="text-sm text-muted-foreground">
              Ta sérénité repas cette semaine
            </p>
          </div>
          <Badge variant="outline" className="text-xs">
            {levelName || levelNames[level]}
          </Badge>
        </div>

        {/* Main Score */}
        <div className="flex items-end justify-between mb-6">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <span className="text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {score}
            </span>
            <span className="text-2xl text-muted-foreground ml-1">/100</span>
          </motion.div>

          {/* Weekly change indicator */}
          <div className={`flex items-center gap-1 ${isPositiveChange ? 'text-green-600' : 'text-red-500'}`}>
            <TrendingUp className={`w-4 h-4 ${!isPositiveChange && 'rotate-180'}`} />
            <span className="text-sm font-medium">
              {isPositiveChange ? '+' : ''}{weeklyChange} cette semaine
            </span>
          </div>
        </div>

        {/* Progress to next level */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Progression niveau {level + 1}</span>
            <span className="font-medium">{score}/{nextLevelAt}</span>
          </div>
          <Progress value={progressToNext} className="h-2" />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Streak */}
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <Flame className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <div className="text-xl font-bold">{streak}</div>
              <div className="text-xs text-muted-foreground">jours de suite</div>
            </div>
          </div>

          {/* Level */}
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <div className="text-xl font-bold">Niv. {level}</div>
              <div className="text-xs text-muted-foreground">{levelNames[level]}</div>
            </div>
          </div>
        </div>

        {/* Motivational message */}
        <div className="mt-4 p-3 bg-primary/5 rounded-lg text-center">
          <p className="text-sm">
            {score < 50 && '🔥 Continue comme ça, chaque action compte !'}
            {score >= 50 && score < 70 && '💪 Tu progresses bien, encore un effort !'}
            {score >= 70 && score < 90 && '🌟 Excellent ! Tu maîtrises ta semaine repas.'}
            {score >= 90 && '🏆 Incroyable ! Tu es un vrai Zen Master !'}
          </p>
        </div>
      </div>
    </Card>
  );
};