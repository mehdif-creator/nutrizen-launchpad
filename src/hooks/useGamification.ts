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
  xp_to_next: number;
}

const DEFAULT_GAMIFICATION: Gamification = {
  points: 0,
  level: 1,
  streak_days: 0,
  badges_count: 0,
  xp_to_next: 100,
};

// Level thresholds
const LEVEL_THRESHOLDS = [0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200];

function computeLevelInfo(points: number): { level: number; xpToNext: number } {
  let level = 1;
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (points >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
    } else {
      break;
    }
  }
  
  const nextThreshold = LEVEL_THRESHOLDS[level] || LEVEL_THRESHOLDS[level - 1] + 500;
  const currentThreshold = LEVEL_THRESHOLDS[level - 1] || 0;
  const xpToNext = nextThreshold - currentThreshold;
  
  return { level, xpToNext };
}

async function fetchGamification(userId: string): Promise<Gamification> {
  // Get gamification data
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

  const points = data.points ?? 0;
  const { xpToNext } = computeLevelInfo(points);

  return {
    points,
    level: data.level ?? 1,
    streak_days: data.streak_days ?? 0,
    badges_count: data.badges_count ?? 0,
    xp_to_next: xpToNext,
  };
}

/**
 * Get level name from level number
 */
export function getLevelName(level: number): string {
  const names: Record<number, string> = {
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
  return names[level] || `Niveau ${level}`;
}

/**
 * Get level color for styling
 */
export function getLevelColor(level: number): string {
  if (level >= 9) return 'text-purple-500';
  if (level >= 7) return 'text-yellow-500';
  if (level >= 5) return 'text-blue-500';
  if (level >= 3) return 'text-green-500';
  return 'text-gray-500';
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

    const unsubscribe = subscribeToGamification(userId, () => {
      queryClient.invalidateQueries({ queryKey: ['gamification', userId] });
    });

    return unsubscribe;
  }, [userId]);

  const gamification = query.data ?? DEFAULT_GAMIFICATION;
  const levelName = getLevelName(gamification.level);

  return {
    ...query,
    gamification,
    levelName,
    levelColor: getLevelColor(gamification.level),
  };
}
