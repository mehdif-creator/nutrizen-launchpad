import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { queryClient } from '@/lib/queryClient';

export interface RecipeInfo {
  recipe_id: string;
  title: string;
  image_url: string | null;
  prep_min: number;
  total_min: number;
  calories: number;
  proteins_g: number;
  carbs_g: number;
  fats_g: number;
  servings: number;
}

export interface DayRecipes {
  date: string;
  day_name: string;
  day_index: number;
  lunch: RecipeInfo | null;
  dinner: RecipeInfo | null;
}

/**
 * Get current week start (Monday) in UTC to match backend
 */
function getCurrentWeekStart(): string {
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(now);
  weekStart.setUTCDate(now.getUTCDate() + diff);
  weekStart.setUTCHours(0, 0, 0, 0);
  return weekStart.toISOString().split('T')[0];
}

async function fetchWeeklyRecipesByDay(userId: string): Promise<DayRecipes[]> {
  const weekStart = getCurrentWeekStart();
  
  console.log('[useWeeklyRecipesByDay] Fetching recipes for user:', userId, 'week_start:', weekStart);

  const { data, error } = await supabase.rpc('get_weekly_recipes_by_day', {
    p_user_id: userId,
    p_week_start: weekStart,
  });

  if (error) {
    console.error('[useWeeklyRecipesByDay] Error fetching recipes:', error);
    throw error;
  }

  const days = (data as unknown as DayRecipes[]) || [];
  console.log('[useWeeklyRecipesByDay] Received days:', days.length);
  return days;
}

export function useWeeklyRecipesByDay(userId: string | undefined) {
  const query = useQuery({
    queryKey: ['weeklyRecipesByDay', userId],
    queryFn: () => fetchWeeklyRecipesByDay(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (!userId) return;

    console.log('[useWeeklyRecipesByDay] Setting up realtime subscription');
    
    const channel = supabase
      .channel('weekly_recipes_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_weekly_menus',
          filter: `user_id=eq.${userId}`
        },
        () => {
          console.log('[useWeeklyRecipesByDay] Menu updated, refetching');
          queryClient.invalidateQueries({ queryKey: ['weeklyRecipesByDay', userId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_weekly_menu_items',
        },
        () => {
          console.log('[useWeeklyRecipesByDay] Menu items updated, refetching');
          queryClient.invalidateQueries({ queryKey: ['weeklyRecipesByDay', userId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return {
    ...query,
    days: query.data || [],
    hasDays: !!query.data && query.data.length > 0,
  };
}
