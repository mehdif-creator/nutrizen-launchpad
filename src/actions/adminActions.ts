import { supabase } from '@/integrations/supabase/client';
import { createLogger } from '@/lib/logger';

const logger = createLogger('adminActions');

export interface AdminActionResult {
  success: boolean;
  message?: string;
  data?: Record<string, unknown>;
}

/**
 * Create a new user (admin only)
 */
export async function createUser(
  email: string,
  password: string | undefined,
  fullName: string | undefined,
  initialCredits: number = 10
): Promise<AdminActionResult> {
  try {
    const { data: session } = await supabase.auth.getSession();
    
    if (!session.session) {
      throw new Error('No active session');
    }

    logger.info(`Creating user: ${email}`);

    const { data, error } = await supabase.functions.invoke('admin-create-user', {
      body: { 
        email,
        password,
        full_name: fullName,
        initial_credits: initialCredits
      },
      headers: {
        Authorization: `Bearer ${session.session.access_token}`,
      },
    });

    if (error) {
      logger.error('Create user error', error);
      throw error;
    }

    return {
      success: data.success ?? false,
      message: data.message,
      data: data,
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
 * Manage user credits (admin only)
 */
export async function manageUserCredits(
  userId: string,
  credits: number,
  operation: 'set' | 'add' | 'subtract'
): Promise<AdminActionResult> {
  try {
    const { data: session } = await supabase.auth.getSession();
    
    if (!session.session) {
      throw new Error('No active session');
    }

    logger.info(`Managing credits for user: ${userId}`);

    const { data, error } = await supabase.functions.invoke('admin-manage-credits', {
      body: { 
        user_id: userId,
        credits,
        operation
      },
      headers: {
        Authorization: `Bearer ${session.session.access_token}`,
      },
    });

    if (error) {
      logger.error('Manage credits error', error);
      throw error;
    }

    return {
      success: data.success ?? false,
      message: data.message,
      data: data,
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
 * Delete a user (admin only)
 */
export async function deleteUser(userId: string): Promise<AdminActionResult> {
  try {
    const { data: session } = await supabase.auth.getSession();
    
    if (!session.session) {
      throw new Error('No active session');
    }

    logger.info(`Deleting user: ${userId}`);

    const { data, error } = await supabase.functions.invoke('admin-delete-user', {
      body: { 
        user_id: userId
      },
      headers: {
        Authorization: `Bearer ${session.session.access_token}`,
      },
    });

    if (error) {
      logger.error('Delete user error', error);
      throw error;
    }

    return {
      success: data.success ?? false,
      message: data.message,
      data: data,
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
 * Reset user account completely (admin only)
 */
export async function resetUserAccount(
  email: string,
  extendTrialDays: number = 30
): Promise<AdminActionResult> {
  try {
    const { data: session } = await supabase.auth.getSession();
    
    if (!session.session) {
      throw new Error('No active session');
    }

    logger.info(`Resetting user: ${email}`);

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
      logger.error('Reset user error', error);
      throw error;
    }

    return {
      success: data.success ?? false,
      message: data.message,
      data: data,
    };
  } catch (error) {
    logger.error('Error', error instanceof Error ? error : new Error(String(error)));
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
