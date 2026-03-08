import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy, Medal } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface LeaderboardEntry {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  total_points: number;
  level: number;
  streak_days: number;
  rank: number;
}

export function LeaderboardCard() {
  const { user } = useAuth();

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['gamification-leaderboard'],
    queryFn: async (): Promise<LeaderboardEntry[]> => {
      const { data, error } = await supabase
        .from('gamification_leaderboard' as any)
        .select('*')
        .order('rank', { ascending: true })
        .limit(20);

      if (error) throw error;
      return (data ?? []) as unknown as LeaderboardEntry[];
    },
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <Card className="p-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" />
          Classement
        </h3>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  if (entries.length === 0) {
    return (
      <Card className="p-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" />
          Classement
        </h3>
        <p className="text-sm text-muted-foreground text-center py-4">
          Pas encore de classement. Gagne des points pour apparaître ici !
        </p>
      </Card>
    );
  }

  const rankIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-3 flex items-center gap-2">
        <Trophy className="h-4 w-4 text-primary" />
        Classement
      </h3>
      <div className="space-y-1 max-h-80 overflow-y-auto">
        {entries.map((entry) => {
          const isCurrentUser = entry.user_id === user?.id;
          return (
            <div
              key={entry.user_id}
              className={`flex items-center gap-3 py-2 px-3 rounded-lg ${
                isCurrentUser
                  ? 'bg-primary/10 border border-primary/20'
                  : 'bg-muted/50'
              }`}
            >
              <span className="text-lg font-bold w-10 text-center">
                {rankIcon(entry.rank)}
              </span>
              <Avatar className="h-8 w-8">
                <AvatarImage src={entry.avatar_url || undefined} />
                <AvatarFallback className="text-xs">
                  {(entry.display_name || '?')[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <span className={`text-sm font-medium truncate block ${isCurrentUser ? 'text-primary' : ''}`}>
                  {entry.display_name || 'Anonyme'}
                  {isCurrentUser && ' (vous)'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold">{entry.total_points}</span>
                <span className="text-xs text-muted-foreground ml-1">pts</span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
