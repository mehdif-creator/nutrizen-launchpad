/**
 * Source of truth for the user's active offer / entitlements: **Supabase only**.
 *
 * Capacitor Preferences is never consulted here. It may only hold local UI
 * state (e.g. "native intro already seen"), see `nativeStartup.ts`.
 *
 * Supabase fields used:
 * - `subscriptions.status` ('active' | 'trialing' | ...), `subscriptions.plan`,
 *   `subscriptions.trial_end`, `subscriptions.current_period_end`
 * - `profiles.plan_tier` (server-controlled, set by Stripe webhook / admin)
 * - `profiles.plan_selection` ('trial' | 'starter' | 'premium'), `profiles.plan_selected_at`
 *   → the explicit formula the user picked (also set from the native paywall)
 */
import { supabase } from '@/integrations/supabase/client';
import { createLogger } from '@/lib/logger';

const logger = createLogger('PlanStatus');

export type PlanSelection = 'trial' | 'starter' | 'premium';

export interface PlanStatus {
  /** 'unknown' when Supabase could not be read — callers must not assume a plan. */
  state: 'has_plan' | 'no_plan' | 'unknown';
  /** Where the plan comes from, for debugging / UI. */
  source: 'subscription' | 'plan_tier' | 'plan_selection' | null;
  /** Paid/trial subscription status when present. */
  subscriptionStatus: string | null;
  planTier: string | null;
  planSelection: PlanSelection | null;
}

const cache = new Map<string, { status: PlanStatus; timestamp: number }>();
const CACHE_TTL = 15000;

export function clearPlanStatusCache(userId?: string) {
  if (userId) cache.delete(userId);
  else cache.clear();
}

function notExpired(date: string | null | undefined): boolean {
  if (!date) return true;
  return new Date(date).getTime() > Date.now();
}

export async function getPlanStatus(userId: string): Promise<PlanStatus> {
  const cached = cache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.status;

  try {
    const [profileRes, subRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('plan_tier, plan_selection, plan_selected_at')
        .eq('id', userId)
        .maybeSingle(),
      supabase
        .from('subscriptions')
        .select('status, plan, trial_end, current_period_end')
        .eq('user_id', userId)
        .maybeSingle(),
    ]);

    if (profileRes.error) {
      logger.error('Error fetching profile plan', profileRes.error);
      return {
        state: 'unknown',
        source: null,
        subscriptionStatus: null,
        planTier: null,
        planSelection: null,
      };
    }

    const planTier = (profileRes.data?.plan_tier as string | null) ?? null;
    const planSelection = (profileRes.data?.plan_selection as PlanSelection | null) ?? null;
    const sub = subRes.error ? null : subRes.data;
    const subscriptionStatus = (sub?.status as string | null) ?? null;

    const activeSubscription =
      subscriptionStatus === 'active'
        ? notExpired(sub?.current_period_end)
        : subscriptionStatus === 'trialing'
          ? notExpired(sub?.trial_end)
          : false;

    let source: PlanStatus['source'] = null;
    if (activeSubscription) source = 'subscription';
    else if (planTier && planTier !== 'free') source = 'plan_tier';
    else if (planSelection) source = 'plan_selection';

    const status: PlanStatus = {
      state: source ? 'has_plan' : 'no_plan',
      source,
      subscriptionStatus,
      planTier,
      planSelection,
    };

    cache.set(userId, { status, timestamp: Date.now() });
    return status;
  } catch (error) {
    logger.error(
      'Exception fetching plan status',
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      state: 'unknown',
      source: null,
      subscriptionStatus: null,
      planTier: null,
      planSelection: null,
    };
  }
}

/**
 * Records the formula chosen by the user in Supabase (never in Preferences).
 * This grants no entitlement by itself: `plan_tier` and `subscriptions` stay
 * server-controlled (Stripe webhook / store receipts / admin).
 */
export async function savePlanSelection(
  userId: string,
  selection: PlanSelection
): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .update({ plan_selection: selection, plan_selected_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) {
    logger.error('Error saving plan selection', error);
    return false;
  }
  clearPlanStatusCache(userId);
  return true;
}
