import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { subscribeToGamification } from '@/lib/realtime';
import { queryClient } from '@/lib/queryClient';

export interface Gamification {
  points: number;
  level: number;
  streak_days: number;
  badges_count: number;
}

const DEFAULT_GAMIFICATION: Gamification = {
  points: 0,
  level: 1,
  streak_days: 0,
  badges_count: 0,
};

async function fetchGamification(userId: string): Promise<Gamification> {
  const { data, error } = await supabase
    .from('user_gamification')
    .select('points, level, streak_days, badges_count')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[useGamification] Error fetching gamification:', error);
    throw error;
  }

  if (!data) {
    console.warn('[useGamification] No gamification found, returning defaults');
    return DEFAULT_GAMIFICATION;
  }

  // Coalesce all values (never show null/undefined)
  return {
    points: data.points ?? 0,
    level: data.level ?? 1,
    streak_days: data.streak_days ?? 0,
    badges_count: data.badges_count ?? 0,
  };
}

/**
 * Calculate level name from points
 */
export function getLevelName(points: number): string {
  if (points < 50) return 'Bronze';
  if (points < 150) return 'Silver';
  if (points < 300) return 'Gold';
  return 'Platinum';
}

/**
 * Get level color for styling
 */
export function getLevelColor(levelName: string): string {
  const colors = {
    Bronze: 'text-amber-700',
    Silver: 'text-gray-400',
    Gold: 'text-yellow-500',
    Platinum: 'text-blue-400',
  };
  return colors[levelName as keyof typeof colors] || colors.Bronze;
}

export function useGamification(userId: string | undefined) {
  const query = useQuery({
    queryKey: ['gamification', userId],
    queryFn: () => fetchGamification(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    placeholderData: DEFAULT_GAMIFICATION,
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (!userId) return;

    const unsubscribe = subscribeToGamification(userId, (payload) => {
      queryClient.invalidateQueries({ queryKey: ['gamification', userId] });
    });

    return unsubscribe;
  }, [userId]);

  const gamification = query.data ?? DEFAULT_GAMIFICATION;
  const levelName = getLevelName(gamification.points);

  return {
    ...query,
    gamification,
    levelName,
    levelColor: getLevelColor(levelName),
  };
}
