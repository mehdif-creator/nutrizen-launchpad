import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Trophy, TrendingUp, Flame } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UserPoints {
  total_points: number;
  current_level: string;
  login_streak: number;
  meals_generated: number;
  meals_completed: number;
  referrals: number;
}

export function GamificationWidget() {
  const { user } = useAuth();
  const [points, setPoints] = useState<UserPoints | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPoints() {
      if (!user) return;

      const { data, error } = await supabase
        .from('user_points')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code === 'PGRST116') {
        // No record exists, create one
        const { data: newData, error: insertError } = await supabase
          .from('user_points')
          .insert({ user_id: user.id })
          .select()
          .single();

        if (!insertError && newData) {
          setPoints(newData);
        }
      } else if (!error && data) {
        setPoints(data);
      }

      setLoading(false);
    }

    loadPoints();
  }, [user]);

  if (loading || !points) {
    return null;
  }

  const levelThresholds = {
    Bronze: 50,
    Silver: 150,
    Gold: 300,
    Platinum: Infinity,
  };

  const currentThreshold = levelThresholds[points.current_level as keyof typeof levelThresholds] || 50;
  const nextLevel = points.current_level === 'Platinum' ? 'Platinum' : 
    points.current_level === 'Gold' ? 'Platinum' :
    points.current_level === 'Silver' ? 'Gold' : 'Silver';
  
  const progressPercent = points.current_level === 'Platinum' ? 100 :
    Math.min((points.total_points / currentThreshold) * 100, 100);

  const levelColors = {
    Bronze: 'text-amber-700',
    Silver: 'text-gray-400',
    Gold: 'text-yellow-500',
    Platinum: 'text-blue-400',
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-primary/5 to-accent/5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-lg mb-1">Ma Progression</h3>
          <div className="flex items-center gap-2">
            <Trophy className={`h-5 w-5 ${levelColors[points.current_level as keyof typeof levelColors]}`} />
            <span className={`font-bold ${levelColors[points.current_level as keyof typeof levelColors]}`}>
              {points.current_level}
            </span>
            <span className="text-sm text-muted-foreground">
              ({points.total_points} points)
            </span>
          </div>
        </div>
        {points.login_streak > 0 && (
          <div className="flex items-center gap-1 text-orange-500">
            <Flame className="h-5 w-5" />
            <span className="font-bold">{points.login_streak}</span>
          </div>
        )}
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            {points.current_level === 'Platinum' ? 'Niveau maximum atteint!' : `Prochain niveau: ${nextLevel}`}
          </span>
          {points.current_level !== 'Platinum' && (
            <span className="font-medium">{currentThreshold - points.total_points} points restants</span>
          )}
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      {points.login_streak > 2 && (
        <div className="flex items-center gap-2 text-sm bg-primary/10 rounded-lg p-3">
          <TrendingUp className="h-4 w-4 text-primary" />
          <span className="text-foreground">
            Tu es sur une série de {points.login_streak} jours ! Continue comme ça pour débloquer ton prochain bonus !
          </span>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
        <div className="text-center">
          <div className="text-2xl font-bold text-primary">{points.meals_generated}</div>
          <div className="text-xs text-muted-foreground">Menus créés</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-accent">{points.meals_completed}</div>
          <div className="text-xs text-muted-foreground">Repas validés</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-500">{points.referrals}</div>
          <div className="text-xs text-muted-foreground">Parrainages</div>
        </div>
      </div>
    </Card>
  );
}
