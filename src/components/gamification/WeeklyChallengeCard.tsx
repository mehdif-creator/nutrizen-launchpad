import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, Calendar } from 'lucide-react';
import { useWeeklyChallenge, useCompleteChallenge } from '@/hooks/useGamificationDashboard';
import { Skeleton } from '@/components/ui/skeleton';

export function WeeklyChallengeCard() {
  const { data: challenge, isLoading } = useWeeklyChallenge();
  const completeMutation = useCompleteChallenge();

  if (isLoading) {
    return (
      <Card className="p-6">
        <Skeleton className="h-32 w-full" />
      </Card>
    );
  }

  if (!challenge) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground">Aucun challenge disponible cette semaine</p>
      </Card>
    );
  }

  const handleComplete = () => {
    completeMutation.mutate();
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-6 w-6 text-yellow-500" />
          <h2 className="text-xl font-bold">Challenge de la semaine</h2>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>Cette semaine</span>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <h3 className="font-semibold text-lg">{challenge.title}</h3>
          <p className="text-sm text-muted-foreground mt-1">{challenge.description}</p>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-yellow-500">+{challenge.points_reward}</span>
            <span className="text-sm text-muted-foreground">points</span>
          </div>
          <Button
            onClick={handleComplete}
            disabled={completeMutation.isPending}
            className="bg-yellow-500 hover:bg-yellow-600 text-white"
          >
            {completeMutation.isPending ? 'Validation...' : 'Marquer comme terminé'}
          </Button>
        </div>
      </div>
    </Card>
  );
}