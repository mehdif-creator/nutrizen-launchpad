/**
 * Shared RevenueCat → Supabase entitlement synchronisation.
 *
 * The client NEVER decides its own entitlement: both `revenuecat-sync`
 * (called by the app after a purchase / restore) and `revenuecat-webhook`
 * (called by RevenueCat servers) read the authoritative subscriber state from
 * the RevenueCat REST API with the secret key, then write:
 *   - public.store_subscriptions  (store entitlement, source of truth for native)
 *   - public.profiles.plan_tier   (mirror, used by credits / feature gating)
 *
 * Stripe web subscriptions are never modified here.
 */
import type { SupabaseClient } from './deps.ts';

/** Entitlement identifiers configured in RevenueCat (exact names). */
export const RC_ENTITLEMENTS = ['premium', 'starter'] as const;
export type RcEntitlement = (typeof RC_ENTITLEMENTS)[number];

export interface RcSubscriber {
  entitlements?: Record<
    string,
    { expires_date?: string | null; product_identifier?: string; purchase_date?: string }
  >;
  subscriptions?: Record<
    string,
    {
      expires_date?: string | null;
      store?: string;
      unsubscribe_detected_at?: string | null;
      billing_issues_detected_at?: string | null;
      period_type?: string;
      is_sandbox?: boolean;
    }
  >;
}

export async function fetchSubscriber(appUserId: string): Promise<RcSubscriber | null> {
  const secret = Deno.env.get('REVENUECAT_SECRET_KEY');
  if (!secret) throw new Error('REVENUECAT_SECRET_KEY is not set');

  const res = await fetch(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`,
    { headers: { Authorization: `Bearer ${secret}`, Accept: 'application/json' } }
  );

  const text = await res.text();
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`RevenueCat API ${res.status}: ${text.slice(0, 300)}`);

  const json = JSON.parse(text) as { subscriber?: RcSubscriber };
  return json.subscriber ?? null;
}

export interface ResolvedState {
  entitlement: RcEntitlement | null;
  productId: string | null;
  status: 'active' | 'in_grace' | 'expired' | 'unknown';
  expiresAt: string | null;
  willRenew: boolean | null;
  environment: 'sandbox' | 'production' | null;
}

/** Turns a RevenueCat subscriber payload into the state stored in Supabase. */
export function resolveState(subscriber: RcSubscriber | null): ResolvedState {
  const empty: ResolvedState = {
    entitlement: null,
    productId: null,
    status: 'expired',
    expiresAt: null,
    willRenew: null,
    environment: null,
  };
  if (!subscriber) return { ...empty, status: 'unknown' };

  const now = Date.now();
  for (const name of RC_ENTITLEMENTS) {
    const ent = subscriber.entitlements?.[name];
    if (!ent) continue;
    const expires = ent.expires_date ? new Date(ent.expires_date).getTime() : null;
    const active = expires === null || expires > now;
    if (!active) continue;

    const productId = ent.product_identifier ?? null;
    const sub = productId ? subscriber.subscriptions?.[productId] : undefined;
    const billingIssue = !!sub?.billing_issues_detected_at;

    return {
      entitlement: name,
      productId,
      status: billingIssue ? 'in_grace' : 'active',
      expiresAt: ent.expires_date ?? null,
      willRenew: sub ? !sub.unsubscribe_detected_at && !billingIssue : null,
      environment: sub?.is_sandbox ? 'sandbox' : 'production',
    };
  }
  return empty;
}

/** Writes the resolved store state and mirrors it on profiles.plan_tier. */
export async function applyState(
  supabase: SupabaseClient,
  appUserId: string,
  state: ResolvedState,
  subscriber: RcSubscriber | null
): Promise<void> {
  const { error: upsertError } = await supabase.from('store_subscriptions').upsert(
    {
      user_id: appUserId,
      provider: 'play_store',
      rc_app_user_id: appUserId,
      entitlement: state.entitlement,
      product_id: state.productId,
      status: state.status,
      expires_at: state.expiresAt,
      will_renew: state.willRenew,
      environment: state.environment,
      raw: subscriber ?? {},
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );
  if (upsertError) throw new Error(`store_subscriptions upsert: ${upsertError.message}`);

  if (state.entitlement && (state.status === 'active' || state.status === 'in_grace')) {
    await supabase
      .from('profiles')
      .update({ plan_tier: state.entitlement })
      .eq('id', appUserId);
    return;
  }

  // Store entitlement lost: only downgrade when there is no active Stripe (web)
  // subscription, so existing web subscribers are never impacted.
  const { data: stripeSub } = await supabase
    .from('subscriptions')
    .select('status, current_period_end, stripe_subscription_id')
    .eq('user_id', appUserId)
    .maybeSingle();

  const stripeActive =
    !!stripeSub?.stripe_subscription_id &&
    stripeSub.status === 'active' &&
    (!stripeSub.current_period_end ||
      new Date(stripeSub.current_period_end).getTime() > Date.now());

  if (!stripeActive && state.status !== 'unknown') {
    await supabase.from('profiles').update({ plan_tier: 'free' }).eq('id', appUserId);
  }
}

/** Full sync for one app user id (= Supabase user id). */
export async function syncAppUser(
  supabase: SupabaseClient,
  appUserId: string
): Promise<ResolvedState> {
  const subscriber = await fetchSubscriber(appUserId);
  const state = resolveState(subscriber);
  await applyState(supabase, appUserId, state, subscriber);
  return state;
}
