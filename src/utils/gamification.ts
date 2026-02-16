import { supabase } from '@/integrations/supabase/client';
import { createLogger } from '@/lib/logger';

const logger = createLogger('Gamification');

export interface PointsAction {
  type: 'daily_login' | 'meal_generated' | 'meal_completed' | 'meal_swap' | 'referral' | 'weekly_completion';
  userId: string;
}

/**
 * Award points to a user for a specific action (atomic via RPC)
 */
export async function awardPoints(action: PointsAction): Promise<boolean> {
  const { type, userId } = action;

  try {
    const { data, error } = await supabase.rpc('rpc_award_points', {
      p_user_id: userId,
      p_action: type,
    });

    if (error) {
      logger.error('Error awarding points', error);
      return false;
    }

    const result = data as { success: boolean; error?: string };
    if (!result.success) {
      if (result.error !== 'already_logged_today') {
        logger.warn('Award points returned error', { error: result.error });
      }
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Error in awardPoints', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Calculate user level based on total points
 */
export function calculateLevel(points: number): string {
  if (points >= 300) return 'Platinum';
  if (points >= 150) return 'Gold';
  if (points >= 50) return 'Silver';
  return 'Bronze';
}

/**
 * Track daily login and award points
 */
export async function trackDailyLogin(userId: string): Promise<boolean> {
  return awardPoints({ type: 'daily_login', userId });
}

/**
 * Award points for meal generation
 */
export async function awardMealGenerationPoints(userId: string): Promise<boolean> {
  return awardPoints({ type: 'meal_generated', userId });
}

/**
 * Award points for meal completion
 */
export async function awardMealCompletionPoints(userId: string): Promise<boolean> {
  return awardPoints({ type: 'meal_completed', userId });
}

interface MealDay {
  breakfast?: { completed?: boolean };
  lunch?: { completed?: boolean };
  dinner?: { completed?: boolean };
}

/**
 * Check if user completed all meals for the week and award bonus
 */
export async function checkAndAwardWeeklyBonus(userId: string, weekOf: string): Promise<boolean> {
  try {
    const { data: mealPlan, error: planError } = await supabase
      .from('meal_plans')
      .select('items')
      .eq('user_id', userId)
      .eq('week_of', weekOf)
      .maybeSingle();

    if (planError || !mealPlan) {
      return false;
    }

    const items = mealPlan.items as Record<string, MealDay>;
    const allCompleted = Object.values(items).every((day) => {
      return day.breakfast?.completed && day.lunch?.completed && day.dinner?.completed;
    });

    if (allCompleted) {
      return awardPoints({ type: 'weekly_completion', userId });
    }

    return false;
  } catch (error) {
    logger.error('Error checking weekly bonus', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Award points for referral
 */
export async function awardReferralPoints(userId: string): Promise<boolean> {
  return awardPoints({ type: 'referral', userId });
}
