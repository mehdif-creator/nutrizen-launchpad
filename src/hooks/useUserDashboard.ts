import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export interface DashboardWallet {
  balance_total: number;
  balance_subscription: number;
  balance_lifetime: number;
}

export interface DashboardDayMeal {
  recipe_id: string;
  title: string;
  image_url: string;
  image_path: string;
  prep_min: number;
  calories: number;
}

export interface DashboardDay {
  date: string;
  day_name: string;
  day_index: number;
  lunch: DashboardDayMeal | null;
  dinner: DashboardDayMeal | null;
}

export interface DashboardWeek {
  week_start: string;
  menu_exists: boolean;
  meals_count: number;
  days: DashboardDay[];
}

export interface DashboardTodayMeal {
  exists: boolean;
  lunch_recipe_id: string | null;
  lunch_title: string | null;
  dinner_recipe_id: string | null;
  dinner_title: string | null;
}

export interface DashboardShoppingListStatus {
  exists: boolean;
  items_total: number;
  items_checked: number;
}

export interface DashboardStreaks {
  current_days: number;
  best_days: number;
}

export interface DashboardGamification {
  level: number;
  xp: number;
  xp_to_next: number;
  badges: Array<{ code: string; name: string; icon: string | null }>;
}

export interface DashboardAdvice {
  id: string | null;
  title: string;
  text: string;
  category: string;
  date: string;
  is_today: boolean;
}

export interface DashboardReferral {
  code: string;
  has_code: boolean;
  clicks: number;
  signups: number;
  qualified: number;
  rewards_earned: number;
}

export interface UserDashboardData {
  wallet: DashboardWallet;
  week: DashboardWeek;
  today_meal: DashboardTodayMeal;
  shopping_list_status: DashboardShoppingListStatus;
  streaks: DashboardStreaks;
  gamification: DashboardGamification;
  advice_of_day: DashboardAdvice;
  referral: DashboardReferral;
  last_updated_at: string;
}

const DEFAULT_DASHBOARD: UserDashboardData = {
  wallet: { balance_total: 0, balance_subscription: 0, balance_lifetime: 0 },
  week: { week_start: new Date().toISOString().split('T')[0], menu_exists: false, meals_count: 0, days: [] },
  today_meal: { exists: false, lunch_recipe_id: null, lunch_title: null, dinner_recipe_id: null, dinner_title: null },
  shopping_list_status: { exists: false, items_total: 0, items_checked: 0 },
  streaks: { current_days: 0, best_days: 0 },
  gamification: { level: 1, xp: 0, xp_to_next: 100, badges: [] },
  advice_of_day: { id: null, title: 'Bienvenue', text: 'Planifie tes repas pour bien démarrer.', category: 'motivation', date: new Date().toISOString(), is_today: true },
  referral: { code: '', has_code: false, clicks: 0, signups: 0, qualified: 0, rewards_earned: 0 },
  last_updated_at: new Date().toISOString(),
};

async function fetchUserDashboard(userId: string): Promise<UserDashboardData> {
  const { data, error } = await supabase.rpc('rpc_get_user_dashboard', {
    p_user_id: userId,
  });

  if (error) {
    console.error('[useUserDashboard] Error fetching dashboard:', error);
    throw error;
  }

  // Parse the JSONB result
  const result = data as unknown as UserDashboardData;
  return result || DEFAULT_DASHBOARD;
}

export function useUserDashboard(userId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['userDashboard', userId],
    queryFn: () => fetchUserDashboard(userId!),
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds - more aggressive refresh
    gcTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: (prev) => prev, // keepPreviousData equivalent
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: 60 * 1000, // Auto-refetch every minute
  });

  // Subscribe to relevant table changes for realtime updates
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`dashboard-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_wallets', filter: `user_id=eq.${userId}` },
        () => queryClient.invalidateQueries({ queryKey: ['userDashboard', userId] })
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'meal_plans', filter: `user_id=eq.${userId}` },
        () => queryClient.invalidateQueries({ queryKey: ['userDashboard', userId] })
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_daily_recipes', filter: `user_id=eq.${userId}` },
        () => queryClient.invalidateQueries({ queryKey: ['userDashboard', userId] })
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'grocery_lists', filter: `user_id=eq.${userId}` },
        () => queryClient.invalidateQueries({ queryKey: ['userDashboard', userId] })
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_gamification', filter: `user_id=eq.${userId}` },
        () => queryClient.invalidateQueries({ queryKey: ['userDashboard', userId] })
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [userId, queryClient]);

  const invalidate = () => {
    // Invalidate all dashboard-related queries
    queryClient.invalidateQueries({ queryKey: ['userDashboard', userId] });
    queryClient.invalidateQueries({ queryKey: ['weeklyRecipesByDay', userId] });
    queryClient.invalidateQueries({ queryKey: ['weeklyMenu', userId] });
    queryClient.invalidateQueries({ queryKey: ['shoppingList', userId] });
    queryClient.invalidateQueries({ queryKey: ['gamification', userId] });
  };

  return {
    ...query,
    dashboard: query.data ?? DEFAULT_DASHBOARD,
    invalidate,
  };
}
