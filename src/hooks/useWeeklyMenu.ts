import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { subscribeToUserMenu } from '@/lib/realtime';
import { queryClient } from '@/lib/queryClient';

export interface WeeklyMenuDay {
  day: string;
  recipe_id: string;
  title: string;
  image_url: string | null;
  prep_min: number;
  total_min: number;
  calories: number;
  macros: {
    proteins_g: number;
    carbs_g: number | null;
    fats_g: number | null;
  };
}

export interface WeeklyMenu {
  menu_id: string;
  user_id: string;
  week_start: string;
  days: WeeklyMenuDay[];
  created_at: string;
  updated_at: string;
}

/**
 * Get current week start (Monday)
 */
export function getCurrentWeekStart(): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust to Monday
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + diff);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart.toISOString().split('T')[0];
}

async function fetchWeeklyMenu(userId: string): Promise<WeeklyMenu | null> {
  const weekStart = getCurrentWeekStart();

  const { data, error } = await supabase
    .from('user_weekly_menus')
    .select('*')
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .maybeSingle();

  if (error) {
    console.error('[useWeeklyMenu] Error fetching menu:', error);
    throw error;
  }

  if (!data) {
    console.warn('[useWeeklyMenu] No menu found for current week');
    return null;
  }

  // Type cast payload to extract days
  const payload = data.payload as { days?: WeeklyMenuDay[] } | null;

  return {
    menu_id: data.menu_id,
    user_id: data.user_id,
    week_start: data.week_start,
    days: payload?.days || [],
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

export function useWeeklyMenu(userId: string | undefined) {
  const query = useQuery({
    queryKey: ['weeklyMenu', userId],
    queryFn: () => fetchWeeklyMenu(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (!userId) return;

    console.log('[useWeeklyMenu] Setting up realtime subscription');
    
    const unsubscribe = subscribeToUserMenu(userId, (payload) => {
      console.log('[useWeeklyMenu] Received update, invalidating cache');
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['weeklyMenu', userId] });
    });

    return unsubscribe;
  }, [userId]);

  return {
    ...query,
    menu: query.data,
    days: query.data?.days || [],
    hasMenu: !!query.data && query.data.days.length > 0,
  };
}
