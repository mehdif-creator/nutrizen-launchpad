import { supabase } from '@/integrations/supabase/client';

export interface CreditsCheckResult {
  success: boolean;
  error_code?: string;
  message?: string;
  current_balance?: number;
  new_balance?: number;
  subscription_balance?: number;
  lifetime_balance?: number;
  required?: number;
  consumed?: number;
}

/**
 * Check and consume credits for a feature
 * @param feature - The feature name ('swap', 'inspifrigo', 'scanrepas')
 * @param cost - Number of credits to consume (default: 1)
 * @returns Result indicating success or insufficient credits
 */
export async function checkAndConsumeCredits(
  feature: string,
  cost: number = 1
): Promise<CreditsCheckResult> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return {
        success: false,
        error_code: 'UNAUTHORIZED',
        message: 'Utilisateur non authentifié',
      };
    }

    const { data, error } = await supabase.rpc('check_and_consume_credits', {
      p_user_id: user.id,
      p_feature: feature,
      p_cost: cost,
    });

    if (error) {
      console.error('Error checking credits:', error);
      return {
        success: false,
        error_code: 'RPC_ERROR',
        message: 'Erreur lors de la vérification des crédits',
      };
    }

    return data as unknown as CreditsCheckResult;
  } catch (error) {
    console.error('Error in checkAndConsumeCredits:', error);
    return {
      success: false,
      error_code: 'UNKNOWN_ERROR',
      message: 'Erreur inconnue',
    };
  }
}

/**
 * Get current credits balance for a user (both subscription and lifetime)
 * @param userId - User ID
 * @returns Object with subscription, lifetime and total credits or null
 */
export async function getCreditsBalance(userId: string): Promise<{
  subscription: number;
  lifetime: number;
  total: number;
} | null> {
  try {
    const { data, error } = await supabase
      .from('user_wallets')
      .select('subscription_credits, lifetime_credits')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No wallet yet, return 0
        return { subscription: 0, lifetime: 0, total: 0 };
      }
      console.error('Error fetching credits balance:', error);
      return null;
    }

    const subscription = data?.subscription_credits ?? 0;
    const lifetime = data?.lifetime_credits ?? 0;
    
    return {
      subscription,
      lifetime,
      total: subscription + lifetime,
    };
  } catch (error) {
    console.error('Error in getCreditsBalance:', error);
    return null;
  }
}

/**
 * Feature credit costs
 */
export const FEATURE_COSTS = {
  swap: 1,
  inspifrigo: 1,
  scanrepas: 1,
} as const;

export type Feature = keyof typeof FEATURE_COSTS;
