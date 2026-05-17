/**
 * Centralized pricing configuration.
 *
 * Single source of truth for plans, intervals, prices and copy.
 * Server-side, the actual Stripe Price IDs are resolved via env vars
 * in `supabase/functions/create-checkout/index.ts` (see PLAN_ENV_KEYS).
 * Client only sends a `planKey` — never a price or amount.
 */

export type BillingInterval = 'month' | 'year';
export type PlanTier = 'starter' | 'premium';

export interface PlanConfig {
  tier: PlanTier;
  /** Display name */
  name: string;
  /** Marketing tagline */
  tagline: string;
  /** Monthly price in EUR (used to derive yearly price = monthly * 12 * 0.8) */
  monthlyPrice: number;
  /** Credits granted per month */
  credits: number;
  /** Max rollover credits */
  rolloverCap: number;
}

/** Annual discount applied to (monthly * 12). 0.20 = 20% off → "2 months free". */
export const ANNUAL_DISCOUNT = 0.2;

export const PLANS: Record<PlanTier, PlanConfig> = {
  starter: {
    tier: 'starter',
    name: 'Starter',
    tagline: 'Mange mieux dès cette semaine. Sans effort.',
    monthlyPrice: 12.99,
    credits: 80,
    rolloverCap: 20,
  },
  premium: {
    tier: 'premium',
    name: 'Premium',
    tagline: 'Le système complet. Mange bien, dépense moins.',
    monthlyPrice: 19.99,
    credits: 200,
    rolloverCap: 80,
  },
};

/** Total amount billed for a plan at a given interval. */
export function getTotalPrice(tier: PlanTier, interval: BillingInterval): number {
  const monthly = PLANS[tier].monthlyPrice;
  if (interval === 'month') return monthly;
  return Number((monthly * 12 * (1 - ANNUAL_DISCOUNT)).toFixed(2));
}

/** Effective monthly price (yearly total / 12). Used for "soit X€/mois" labels. */
export function getEffectiveMonthlyPrice(tier: PlanTier, interval: BillingInterval): number {
  if (interval === 'month') return PLANS[tier].monthlyPrice;
  return Number((getTotalPrice(tier, 'year') / 12).toFixed(2));
}

/** Absolute savings (EUR) of yearly over monthly billing for a full year. */
export function getYearlySavings(tier: PlanTier): number {
  const monthly = PLANS[tier].monthlyPrice;
  return Number((monthly * 12 - getTotalPrice(tier, 'year')).toFixed(2));
}

/**
 * Build the `planKey` sent to the `create-checkout` edge function.
 * Monthly stays as the legacy key (`starter`, `premium`) for backward
 * compatibility with existing subscriptions and analytics.
 */
export function getPlanKey(tier: PlanTier, interval: BillingInterval): string {
  if (interval === 'month') return tier;
  return `${tier}_yearly`;
}

/** Format EUR with French locale (comma decimal). */
export function formatEUR(value: number, opts?: { showCents?: boolean }): string {
  const showCents = opts?.showCents ?? true;
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(value);
}
