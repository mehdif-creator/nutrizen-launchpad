/**
 * Native free-offer activation.
 *
 * Reuses the **existing NutriZen server logic**: the `grant_welcome_credits`
 * SECURITY DEFINER RPC already used by the web onboarding. It is idempotent
 * (guarded by `profiles.welcome_credits_granted`) and does, server-side:
 *   - credit the wallet with 11 credits (user_wallets)
 *   - insert the trial subscription (status 'trialing', plan 'trial',
 *     trial_start = now(), trial_end = now() + 7 days) — ON CONFLICT DO NOTHING
 *
 * No trial/credit logic is duplicated here.
 */
import { supabase } from '@/integrations/supabase/client';
import { createLogger } from '@/lib/logger';
import { clearPlanStatusCache, savePlanSelection } from '@/lib/native/planStatus';

const logger = createLogger('NativeTrial');

export interface ActivateTrialResult {
  ok: boolean;
  alreadyActive: boolean;
  message?: string;
}

/**
 * Activates (or reuses) the 7-day / 11-credit free offer for the given user,
 * then records the explicit `trial` selection in Supabase.
 * Double-click safe: the RPC is idempotent and never grants credits twice.
 */
export async function activateFreeTrial(userId: string): Promise<ActivateTrialResult> {
  const { data, error } = await supabase.rpc('grant_welcome_credits', { p_user_id: userId });

  if (error) {
    logger.error('grant_welcome_credits failed', error);
    return { ok: false, alreadyActive: false, message: error.message };
  }

  const payload = (data ?? {}) as { success?: boolean; already_granted?: boolean };
  if (payload.success === false) {
    return { ok: false, alreadyActive: false, message: "L'essai n'a pas pu être activé." };
  }

  const saved = await savePlanSelection(userId, 'trial');
  if (!saved) {
    return { ok: false, alreadyActive: !!payload.already_granted, message: 'Enregistrement impossible.' };
  }

  clearPlanStatusCache(userId);
  return { ok: true, alreadyActive: !!payload.already_granted };
}
