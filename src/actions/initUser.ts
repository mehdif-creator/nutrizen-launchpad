import { supabase } from '@/integrations/supabase/client';
import { createLogger } from '@/lib/logger';

const logger = createLogger('initUser');

export interface InitUserResult {
  success: boolean;
  message?: string;
  user_id?: string;
}

/**
 * Initialize user rows (dashboard stats, gamification, points)
 * Calls Edge Function
 */
export async function initUserRows(userId: string): Promise<InitUserResult> {
  try {
    // Get current session
    const { data: session } = await supabase.auth.getSession();
    
    if (!session.session) {
      throw new Error('No active session');
    }

    logger.info('Calling init-user-rows edge function');

    // Call Edge Function
    const { data, error } = await supabase.functions.invoke('init-user-rows', {
      body: { user_id: userId },
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
    };
  } catch (error) {
    logger.error('Error', error instanceof Error ? error : new Error(String(error)));
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Initialize user on signup/onboarding completion
 */
export async function initializeNewUser(userId: string) {
  const result = await initUserRows(userId);
  
  if (!result.success) {
    logger.error('Failed to initialize user', new Error(result.message || 'Unknown'));
  }
  
  return result;
}
