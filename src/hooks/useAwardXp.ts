import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

export type GamificationEventType =
  | 'onboarding_completed'
  | 'weekly_menu_generated'
  | 'grocery_list_generated'
  | 'recipe_viewed'
  | 'meal_marked_done'
  | 'streak_daily_login';

const XP_VALUES: Record<GamificationEventType, number> = {
  onboarding_completed: 50,
  weekly_menu_generated: 20,
  grocery_list_generated: 10,
  recipe_viewed: 1,
  meal_marked_done: 5,
  streak_daily_login: 2,
};

interface AwardXpResult {
  success: boolean;
  alreadyProcessed: boolean;
  xp?: number;
  xpDelta?: number;
  level?: number;
  streakDays?: number;
  error?: string;
}

export function useAwardXp() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  /**
   * Award XP for a gamification event
   * @param eventType - The type of event
   * @param idempotencyKey - Unique key to prevent double rewards (e.g., 'menu:user_id:2024-W05')
   * @param metadata - Optional metadata to store with the event
   */
  const awardXp = useCallback(
    async (
      eventType: GamificationEventType,
      idempotencyKey: string,
      metadata?: Record<string, unknown>
    ): Promise<AwardXpResult> => {
      if (!user?.id) {
        return { success: false, alreadyProcessed: false, error: 'Not authenticated' };
      }

      try {
        const xpDelta = XP_VALUES[eventType] || 0;

        // Call the RPC - function may not be in generated types yet
        const { data, error } = await (supabase.rpc as Function)('rpc_award_xp', {
          p_user_id: user.id,
          p_event_type: eventType,
          p_xp_delta: xpDelta,
          p_idempotency_key: idempotencyKey,
          p_metadata: metadata || {},
        });

        if (error) {
          console.error('[useAwardXp] Error awarding XP:', error);
          return { success: false, alreadyProcessed: false, error: error.message };
        }

        const result = data as {
          success: boolean;
          already_processed: boolean;
          xp: number;
          xp_delta?: number;
          level_info: { level: number };
          streak_days: number;
        } | null;

        // Invalidate gamification queries to refresh UI
        if (result && !result.already_processed) {
          queryClient.invalidateQueries({ queryKey: ['gamification', user.id] });
          queryClient.invalidateQueries({ queryKey: ['userDashboard', user.id] });
        }

        return {
          success: result?.success ?? false,
          alreadyProcessed: result?.already_processed ?? false,
          xp: result?.xp,
          xpDelta: result?.xp_delta,
          level: result?.level_info?.level,
          streakDays: result?.streak_days,
        };
      } catch (error) {
        console.error('[useAwardXp] Unexpected error:', error);
        return { 
          success: false, 
          alreadyProcessed: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    },
    [user?.id, queryClient]
  );

  /**
   * Convenience method for daily login XP
   */
  const awardDailyLogin = useCallback(async () => {
    if (!user?.id) return;
    const today = new Date().toISOString().split('T')[0];
    return awardXp('streak_daily_login', `login:${user.id}:${today}`);
  }, [user?.id, awardXp]);

  /**
   * Convenience method for recipe view XP (max 5/day)
   */
  const awardRecipeView = useCallback(
    async (recipeId: string) => {
      if (!user?.id) return;
      const today = new Date().toISOString().split('T')[0];
      // The idempotency key includes recipe ID to allow viewing different recipes
      // but prevent re-awarding for the same recipe on the same day
      return awardXp('recipe_viewed', `recipe_view:${user.id}:${recipeId}:${today}`);
    },
    [user?.id, awardXp]
  );

  return {
    awardXp,
    awardDailyLogin,
    awardRecipeView,
    XP_VALUES,
  };
}
