import { supabase } from '@/integrations/supabase/client';
import { createLogger } from '@/lib/logger';

const logger = createLogger('adminResetUser');

export interface ResetUserResult {
  success: boolean;
  message?: string;
  user_id?: string;
  new_trial_end?: string;
}

/**
 * Reset a user account completely (admin only)
 * Resets swaps, points, gamification, stats, deletes meal plans
 * Extends trial period
 */
export async function resetUserAccount(
  email: string,
  extendTrialDays: number = 30
): Promise<ResetUserResult> {
  try {
    // Get current session
    const { data: session } = await supabase.auth.getSession();
    
    if (!session.session) {
      throw new Error('No active session');
    }

    logger.info(`Resetting user: ${email}`);

    // Call Edge Function
    const { data, error } = await supabase.functions.invoke('admin-reset-user', {
      body: { 
        email,
        extendTrialDays 
      },
      headers: {
        Authorization: `Bearer ${session.session.access_token}`,
      },
    });

    if (error) {
      logger.error('Edge function error', error);
      throw error;
    }

    logger.debug('Success', { data });

    return {
      success: data.success ?? false,
      message: data.message,
      user_id: data.user_id,
      new_trial_end: data.new_trial_end,
    };
  } catch (error) {
    logger.error('Error', error instanceof Error ? error : new Error(String(error)));
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
