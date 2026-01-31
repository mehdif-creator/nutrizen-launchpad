import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Trophy, Flame, Medal, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { BadgesModal } from './BadgesModal';

interface ProgressionCardProps {
  points: number;
  level: number;
  xpToNext: number;
  streakDays: number;
  badgesCount: number;
  isLoading?: boolean;
}

const LEVEL_NAMES: Record<number, string> = {
  1: 'Debutant',
  2: 'Apprenti',
  3: 'Cuisinier',
  4: 'Chef',
  5: 'Chef etoile',
  6: 'Grand Chef',
  7: 'Chef Executif',
  8: 'Maitre Cuisinier',
  9: 'Legende',
  10: 'Maitre Zen',
};

const LEVEL_THRESHOLDS = [0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200];

export function ProgressionCard({
  points,
  level,
  xpToNext,
  streakDays,
  badgesCount,
  isLoading = false,
}: ProgressionCardProps) {
  const [badgesModalOpen, setBadgesModalOpen] = useState(false);

  if (isLoading) {
    return (
      <Card className="p-4 md:p-5">
        <div className="flex items-center gap-2 mb-3">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-5 w-24" />
        </div>
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-3 w-32" />
      </Card>
    );
  }

  const currentLevelThreshold = LEVEL_THRESHOLDS[level - 1] || 0;
  const nextLevelThreshold = LEVEL_THRESHOLDS[level] || LEVEL_THRESHOLDS[level - 1] + 500;
  const xpInCurrentLevel = points - currentLevelThreshold;
  const xpNeededForLevel = nextLevelThreshold - currentLevelThreshold;
  const progressPercent = xpNeededForLevel > 0 
    ? Math.min(100, Math.round((xpInCurrentLevel / xpNeededForLevel) * 100))
    : 100;

  const levelName = LEVEL_NAMES[level] || `Niveau ${level}`;

  return (
    <>
      <Card className="p-4 md:p-5 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-primary/20">
              <Trophy className="h-4 w-4 text-primary" />
            </div>
            <h3 className="font-semibold">Progression</h3>
          </div>
          {streakDays > 0 && (
            <Badge variant="secondary" className="gap-1">
              <Flame className="h-3 w-3 text-orange-500" />
              {streakDays} jour{streakDays > 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-2xl font-bold text-primary">Niveau {level}</span>
              <span className="text-sm text-muted-foreground ml-2">{levelName}</span>
            </div>
            <span className="text-sm font-medium">{points} pts</span>
          </div>

          <div className="space-y-1">
            <Progress value={progressPercent} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{xpInCurrentLevel} / {xpNeededForLevel} pts</span>
              {level < 10 && <span>Prochain: {nextLevelThreshold} pts</span>}
            </div>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-4 justify-between"
          onClick={() => setBadgesModalOpen(true)}
        >
          <span className="flex items-center gap-2">
            <Medal className="h-4 w-4" />
            Mes badges ({badgesCount})
          </span>
          <ChevronRight className="h-4 w-4" />
        </Button>

        {points === 0 && streakDays === 0 && (
          <p className="text-xs text-muted-foreground text-center mt-3">
            Utilise NutriZen pour debloquer des recompenses.
          </p>
        )}
      </Card>

      <BadgesModal open={badgesModalOpen} onOpenChange={setBadgesModalOpen} />
    </>
  );
}
