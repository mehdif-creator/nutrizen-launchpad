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
  needs_regeneration?: boolean;
  nutrition_note?: string;
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

  // RPC added by migration 20261002060229 (types not yet regenerated).
  const { data: result, error } = await (supabase.rpc as (...args: unknown[]) => Promise<{ data: unknown; error: unknown }>)('get_visible_weekly_menu', {
    p_user_id: userId,
    p_week_start: weekStart,
  });
  const data = result as unknown as {
    menu_id: string;
    user_id: string;
    week_start: string;
    payload: unknown;
    created_at: string;
    updated_at: string;
    needs_regeneration?: boolean;
    used_fallback?: string;
  };

  if (error) {
    logger.error('Error fetching menu', error);
    throw error;
  }

  if (!data) {
    logger.warn('No menu found for current week', { weekStart });
    return null;
  }

  // Type cast payload defensively — payload may be null, a string, or malformed JSON
  let payload: {
    days?: WeeklyMenuDay[];
    nutrition_note?: string;
    household?: {
      adults: number;
      children: number;
      effective_size: number;
    };
  } | null = null;

  try {
    const raw = data.payload as unknown;
    if (typeof raw === 'string') {
      payload = JSON.parse(raw);
    } else if (raw && typeof raw === 'object') {
      payload = raw as typeof payload;
    }
  } catch (e) {
    logger.error('Failed to parse menu payload', e);
    payload = null;
  }

  // Defensive guard: ensure days is always a valid array
  const safeDays: WeeklyMenuDay[] = Array.isArray(payload?.days)
    ? (payload!.days as WeeklyMenuDay[]).filter(
        (d): d is WeeklyMenuDay => !!d && typeof d === 'object'
      )
    : [];

  logger.debug('Menu data received', {
    menu_id: data.menu_id,
    day_count: safeDays.length,
    used_fallback: data.used_fallback,
    household: payload?.household,
  });

  return {
    menu_id: data.menu_id,
    user_id: data.user_id,
    week_start: data.week_start,
    days: safeDays,
    created_at: data.created_at,
    updated_at: data.updated_at,
    used_fallback: data.used_fallback,
    needs_regeneration: data.needs_regeneration ?? false,
    household: payload?.household,
    nutrition_note: payload?.nutrition_note,
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
          filter: `user_id=eq.${userId}`,
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
    days: Array.isArray(query.data?.days) ? query.data!.days : [],
    householdAdults: query.data?.household?.adults ?? 1,
    householdChildren: query.data?.household?.children ?? 0,
    hasMenu: !!query.data && Array.isArray(query.data.days) && query.data.days.length > 0,
  };
}
