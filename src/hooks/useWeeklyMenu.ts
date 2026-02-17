import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { queryClient } from '@/lib/queryClient';
import { createLogger } from '@/lib/logger';

const logger = createLogger('useWeeklyMenu');

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
  used_fallback?: string | null;
  household?: {
    adults: number;
    children: number;
    effective_size: number;
  };
}

/**
 * Get current week start (Monday) in UTC to match backend
 */
export function getCurrentWeekStart(): string {
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust to Monday
  const weekStart = new Date(now);
  weekStart.setUTCDate(now.getUTCDate() + diff);
  weekStart.setUTCHours(0, 0, 0, 0);
  return weekStart.toISOString().split('T')[0];
}

async function fetchWeeklyMenu(userId: string): Promise<WeeklyMenu | null> {
  const weekStart = getCurrentWeekStart();
  
  logger.debug('Fetching menu', { userId, weekStart });

  const { data, error } = await supabase
    .from('user_weekly_menus')
    .select('*')
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .maybeSingle();

  if (error) {
    logger.error('Error fetching menu', error);
    throw error;
  }

  if (!data) {
    logger.warn('No menu found for current week', { weekStart });
    return null;
  }

  // Type cast payload to extract days and household
  const payload = data.payload as { 
    days?: WeeklyMenuDay[];
    household?: {
      adults: number;
      children: number;
      effective_size: number;
    };
  } | null;

  logger.debug('Menu data received', {
    menu_id: data.menu_id,
    day_count: payload?.days?.length,
    used_fallback: data.used_fallback,
    household: payload?.household
  });

  return {
    menu_id: data.menu_id,
    user_id: data.user_id,
    week_start: data.week_start,
    days: payload?.days || [],
    created_at: data.created_at,
    updated_at: data.updated_at,
    used_fallback: data.used_fallback,
    household: payload?.household,
  };
}

export function useWeeklyMenu(userId: string | undefined) {
  const query = useQuery({
    queryKey: ['weeklyMenu', userId],
    queryFn: () => fetchWeeklyMenu(userId!),
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (!userId) return;

    logger.debug('Setting up realtime subscription', { userId });
    
    const channel = supabase
      .channel(`user_weekly_menus_changes_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_weekly_menus',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          logger.debug('Received realtime update', { eventType: payload.eventType });
          // Invalidate and refetch
          queryClient.invalidateQueries({ queryKey: ['weeklyMenu', userId] });
        }
      )
      .subscribe((status) => {
        logger.debug('Realtime subscription status', { status });
      });

    return () => {
      logger.debug('Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return {
    ...query,
    menu: query.data,
    days: query.data?.days || [],
    householdAdults: query.data?.household?.adults ?? 1,
    householdChildren: query.data?.household?.children ?? 0,
    hasMenu: !!query.data && query.data.days.length > 0,
  };
}
