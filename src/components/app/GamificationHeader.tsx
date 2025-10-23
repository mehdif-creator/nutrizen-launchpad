import { Badge } from '@/components/ui/badge';
import { Trophy, Flame } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function GamificationHeader() {
  const { user } = useAuth();
  const [gamification, setGamification] = useState<{ points: number; level: number; streak_days: number } | null>(null);

  useEffect(() => {
    async function loadGamification() {
      if (!user) return;

      const { data } = await supabase
        .from('user_gamification')
        .select('points, level, streak_days')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setGamification(data);
      } else {
        // Default to zeros if not found
        setGamification({ points: 0, level: 1, streak_days: 0 });
      }
    }

    loadGamification();

    // Set up real-time subscription for updates
    const channel = supabase
      .channel('user_gamification_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_gamification',
          filter: `user_id=eq.${user?.id}`,
        },
        (payload) => {
          if (payload.new) {
            setGamification({
              points: (payload.new as any).points || 0,
              level: (payload.new as any).level || 1,
              streak_days: (payload.new as any).streak_days || 0,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (!gamification) return null;

  // Calculate level name from points
  const getLevelName = (points: number) => {
    if (points < 50) return 'Bronze';
    if (points < 150) return 'Silver';
    if (points < 300) return 'Gold';
    return 'Platinum';
  };

  const levelName = getLevelName(gamification.points);

  const levelColors = {
    Bronze: 'bg-amber-700/10 text-amber-700 border-amber-700/20',
    Silver: 'bg-gray-400/10 text-gray-400 border-gray-400/20',
    Gold: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    Platinum: 'bg-blue-400/10 text-blue-400 border-blue-400/20',
  };

  return (
    <div className="flex items-center gap-3">
      {gamification.streak_days > 0 && (
        <div className="flex items-center gap-1 px-2 py-1 bg-orange-500/10 rounded-lg">
          <Flame className="h-4 w-4 text-orange-500" />
          <span className="text-sm font-bold text-orange-500">{gamification.streak_days}</span>
        </div>
      )}
      
      <Badge 
        variant="outline" 
        className={`flex items-center gap-1.5 px-3 py-1 ${levelColors[levelName as keyof typeof levelColors]}`}
      >
        <Trophy className="h-3.5 w-3.5" />
        <span className="font-semibold">{levelName}</span>
        <span className="text-xs opacity-70">• {gamification.points} pts</span>
      </Badge>
    </div>
  );
}
