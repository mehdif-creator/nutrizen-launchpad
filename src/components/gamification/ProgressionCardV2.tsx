import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Trophy, Flame } from 'lucide-react';
import {
  useGamificationState,
  useLevels,
  getLevelName,
  getNextLevelThreshold,
  getCurrentLevelThreshold,
} from '@/hooks/useGamificationV2';

export function ProgressionCardV2() {
  const { data: state, isLoading: stateLoading } = useGamificationState();
  const { data: levels = [], isLoading: levelsLoading } = useLevels();

  const isLoading = stateLoading || levelsLoading;

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

  if (!state) return null;

  const currentThreshold = getCurrentLevelThreshold(state.level, levels);
  const nextThreshold = getNextLevelThreshold(state.level, levels);
  const xpInLevel = state.total_points - currentThreshold;
  const xpNeeded = nextThreshold - currentThreshold;
  const progress = xpNeeded > 0
    ? Math.min(100, Math.round((xpInLevel / xpNeeded) * 100))
    : 100;

  const levelName = getLevelName(state.level, levels);

  return (
    <Card className="p-4 md:p-5 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-full bg-primary/20">
            <Trophy className="h-4 w-4 text-primary" />
          </div>
          <h3 className="font-semibold">Progression</h3>
        </div>
        {state.streak_days > 0 && (
          <Badge variant="secondary" className="gap-1">
            <Flame className="h-3 w-3 text-orange-500" />
            {state.streak_days} jour{state.streak_days > 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-2xl font-bold text-primary">Niveau {state.level}</span>
            <span className="text-sm text-muted-foreground ml-2">{levelName}</span>
          </div>
          <span className="text-sm font-medium">{state.total_points} pts</span>
        </div>

        <div className="space-y-1">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{xpInLevel} / {xpNeeded} pts</span>
            {state.level < 10 && <span>Prochain : {nextThreshold} pts</span>}
          </div>
        </div>
      </div>

      {state.total_points === 0 && state.streak_days === 0 && (
        <p className="text-xs text-muted-foreground text-center mt-3">
          Utilise NutriZen pour débloquer des récompenses.
        </p>
      )}
    </Card>
  );
}
