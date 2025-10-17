import { supabase } from '@/integrations/supabase/client';

export interface PointsAction {
  type: 'daily_login' | 'meal_generated' | 'meal_completed' | 'meal_swap' | 'referral' | 'weekly_completion';
  userId: string;
}

const POINTS_CONFIG = {
  daily_login: 1,
  meal_generated: 1,
  meal_completed: 2,
  meal_swap: 2,
  referral: 5,
  weekly_completion: 10,
};

/**
 * Award points to a user for a specific action
 */
export async function awardPoints(action: PointsAction): Promise<boolean> {
  const { type, userId } = action;
  const pointsToAward = POINTS_CONFIG[type];

  try {
    // Get current user points
    const { data: userPoints, error: fetchError } = await supabase
      .from('user_points')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching user points:', fetchError);
      return false;
    }

    // If no record exists, create one
    if (!userPoints) {
      const { error: insertError } = await supabase
        .from('user_points')
        .insert({
          user_id: userId,
          total_points: pointsToAward,
          current_level: 'Bronze',
          login_streak: type === 'daily_login' ? 1 : 0,
          meals_generated: type === 'meal_generated' ? 1 : 0,
          meals_completed: type === 'meal_completed' ? 1 : 0,
          referrals: type === 'referral' ? 1 : 0,
          last_login_date: type === 'daily_login' ? new Date().toISOString().split('T')[0] : null,
        });

      return !insertError;
    }

    // Update existing record
    const newTotalPoints = userPoints.total_points + pointsToAward;
    const newLevel = calculateLevel(newTotalPoints);

    const updates: any = {
      total_points: newTotalPoints,
      current_level: newLevel,
    };

    // Handle specific action updates
    if (type === 'daily_login') {
      const today = new Date().toISOString().split('T')[0];
      const lastLogin = userPoints.last_login_date;
      
      if (lastLogin) {
        const lastLoginDate = new Date(lastLogin);
        const todayDate = new Date(today);
        const diffTime = todayDate.getTime() - lastLoginDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          // Consecutive day - increment streak
          updates.login_streak = userPoints.login_streak + 1;
        } else if (diffDays > 1) {
          // Streak broken - reset to 1
          updates.login_streak = 1;
        }
        // If diffDays === 0, it's the same day - don't award points again
        if (diffDays === 0) {
          return false; // Already logged in today
        }
      } else {
        updates.login_streak = 1;
      }
      
      updates.last_login_date = today;
    } else if (type === 'meal_generated') {
      updates.meals_generated = userPoints.meals_generated + 1;
    } else if (type === 'meal_completed' || type === 'meal_swap') {
      updates.meals_completed = userPoints.meals_completed + 1;
    } else if (type === 'referral') {
      updates.referrals = userPoints.referrals + 1;
    }

    const { error: updateError } = await supabase
      .from('user_points')
      .update(updates)
      .eq('user_id', userId);

    return !updateError;
  } catch (error) {
    console.error('Error awarding points:', error);
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

/**
 * Check if user completed all meals for the week and award bonus
 */
export async function checkAndAwardWeeklyBonus(userId: string, weekOf: string): Promise<boolean> {
  try {
    // Get the meal plan for the week
    const { data: mealPlan, error: planError } = await supabase
      .from('meal_plans')
      .select('items')
      .eq('user_id', userId)
      .eq('week_of', weekOf)
      .maybeSingle();

    if (planError || !mealPlan) {
      return false;
    }

    // Check if all meals are completed
    const items = mealPlan.items as any;
    const allCompleted = Object.values(items).every((day: any) => {
      return day.breakfast?.completed && day.lunch?.completed && day.dinner?.completed;
    });

    if (allCompleted) {
      // Award weekly completion bonus
      return awardPoints({ type: 'weekly_completion', userId });
    }

    return false;
  } catch (error) {
    console.error('Error checking weekly bonus:', error);
    return false;
  }
}

/**
 * Award points for referral
 */
export async function awardReferralPoints(userId: string): Promise<boolean> {
  return awardPoints({ type: 'referral', userId });
}
