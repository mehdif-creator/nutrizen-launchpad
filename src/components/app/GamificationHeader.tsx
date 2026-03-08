import { Badge } from '@/components/ui/badge';
import { Trophy, Flame } from 'lucide-react';
import { useGamificationState, useLevels, getLevelName } from '@/hooks/useGamificationV2';

export function GamificationHeader() {
  const { data: state } = useGamificationState();
  const { data: levels = [] } = useLevels();

  if (!state) return null;

  const levelName = getLevelName(state.level, levels);

  const levelColors: Record<number, string> = {
    1: 'bg-muted text-muted-foreground border-muted',
    2: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    3: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    4: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    5: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  };

  const colorClass = levelColors[Math.min(state.level, 5)] || levelColors[1];

  return (
    <div className="flex items-center gap-3">
      {state.streak_days > 0 && (
        <div className="flex items-center gap-1 px-2 py-1 bg-orange-500/10 rounded-lg">
          <Flame className="h-4 w-4 text-orange-500" />
          <span className="text-sm font-bold text-orange-500">{state.streak_days}</span>
        </div>
      )}
      
      <Badge 
        variant="outline" 
        className={`flex items-center gap-1.5 px-3 py-1 ${colorClass}`}
      >
        <Trophy className="h-3.5 w-3.5" />
        <span className="font-semibold">{levelName}</span>
        <span className="text-xs opacity-70">• {state.total_points} pts</span>
      </Badge>
    </div>
  );
}
