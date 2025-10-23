import { supabase } from '@/integrations/supabase/client';

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

    console.log('[initUser] Calling init-user-rows edge function');

    // Call Edge Function
    const { data, error } = await supabase.functions.invoke('init-user-rows', {
      body: { user_id: userId },
      headers: {
        Authorization: `Bearer ${session.session.access_token}`,
      },
    });

    if (error) {
      console.error('[initUser] Edge function error:', error);
      throw error;
    }

    console.log('[initUser] Success:', data);

    return {
      success: data.success ?? false,
      message: data.message,
      user_id: data.user_id,
    };
  } catch (error) {
    console.error('[initUser] Error:', error);
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
    console.error('[initializeNewUser] Failed to initialize user:', result.message);
  }
  
  return result;
}
