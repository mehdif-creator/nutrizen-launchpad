import { Badge } from '@/components/ui/badge';
import { Trophy, Flame } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function GamificationHeader() {
  const { user } = useAuth();
  const [points, setPoints] = useState<{ total_points: number; current_level: string; login_streak: number } | null>(null);

  useEffect(() => {
    async function loadPoints() {
      if (!user) return;

      const { data } = await supabase
        .from('user_points')
        .select('total_points, current_level, login_streak')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setPoints(data);
      }
    }

    loadPoints();

    // Set up real-time subscription for updates
    const channel = supabase
      .channel('user_points_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_points',
          filter: `user_id=eq.${user?.id}`,
        },
        (payload) => {
          if (payload.new) {
            setPoints({
              total_points: (payload.new as any).total_points,
              current_level: (payload.new as any).current_level,
              login_streak: (payload.new as any).login_streak,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (!points) return null;

  const levelColors = {
    Bronze: 'bg-amber-700/10 text-amber-700 border-amber-700/20',
    Silver: 'bg-gray-400/10 text-gray-400 border-gray-400/20',
    Gold: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    Platinum: 'bg-blue-400/10 text-blue-400 border-blue-400/20',
  };

  return (
    <div className="flex items-center gap-3">
      {points.login_streak > 0 && (
        <div className="flex items-center gap-1 px-2 py-1 bg-orange-500/10 rounded-lg">
          <Flame className="h-4 w-4 text-orange-500" />
          <span className="text-sm font-bold text-orange-500">{points.login_streak}</span>
        </div>
      )}
      
      <Badge 
        variant="outline" 
        className={`flex items-center gap-1.5 px-3 py-1 ${levelColors[points.current_level as keyof typeof levelColors]}`}
      >
        <Trophy className="h-3.5 w-3.5" />
        <span className="font-semibold">{points.current_level}</span>
        <span className="text-xs opacity-70">• {points.total_points} pts</span>
      </Badge>
    </div>
  );
}
