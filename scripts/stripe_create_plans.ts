/**
 * Idempotent Stripe Products/Prices Creation Script for NutriZen v2
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_test_xxx npx tsx scripts/stripe_create_plans.ts
 *
 * This script is idempotent: it looks up products by metadata.internal_key
 * and reuses them if found. Safe to run multiple times.
 */

import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY is required');
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2025-08-27.basil' as any });

interface PlanDef {
  internal_key: string;
  product_name: string;
  product_description: string;
  price_amount: number; // in cents
  currency: string;
  recurring_interval?: 'month' | 'year';
  metadata: Record<string, string>;
}

const PLANS: PlanDef[] = [
  // Subscription plans
  {
    internal_key: 'nutrizen_starter_monthly_1299',
    product_name: 'NutriZen Starter',
    product_description: '80 crédits IA / mois - Menus + liste de courses en continu',
    price_amount: 1299,
    currency: 'eur',
    recurring_interval: 'month',
    metadata: {
      plan_tier: 'starter',
      credits_monthly: '80',
      rollover_cap: '20',
      priority_generation: 'false',
      topup_discount_pct: '0',
      tax_mode: 'inclusive',
    },
  },
  {
    internal_key: 'nutrizen_premium_monthly_1999',
    product_name: 'NutriZen Premium',
    product_description: '200 crédits IA / mois - Menus + scans + ajustements + priorité',
    price_amount: 1999,
    currency: 'eur',
    recurring_interval: 'month',
    metadata: {
      plan_tier: 'premium',
      credits_monthly: '200',
      rollover_cap: '80',
      priority_generation: 'true',
      topup_discount_pct: '10',
      tax_mode: 'inclusive',
    },
  },
  // Top-up packs
  {
    internal_key: 'nutrizen_topup_30_999',
    product_name: 'NutriZen Credits Pack 30',
    product_description: '30 crédits IA non expirants',
    price_amount: 999,
    currency: 'eur',
    metadata: { topup_credits: '30', tax_mode: 'inclusive' },
  },
  {
    internal_key: 'nutrizen_topup_80_1999',
    product_name: 'NutriZen Credits Pack 80',
    product_description: '80 crédits IA non expirants',
    price_amount: 1999,
    currency: 'eur',
    metadata: { topup_credits: '80', tax_mode: 'inclusive' },
  },
  {
    internal_key: 'nutrizen_topup_200_3999',
    product_name: 'NutriZen Credits Pack 200',
    product_description: '200 crédits IA non expirants',
    price_amount: 3999,
    currency: 'eur',
    metadata: { topup_credits: '200', tax_mode: 'inclusive' },
  },
];

async function findExistingPrice(internalKey: string): Promise<Stripe.Price | null> {
  const prices = await stripe.prices.search({
    query: `metadata["internal_key"]:"${internalKey}"`,
    limit: 1,
  });
  return prices.data[0] || null;
}

async function createOrReuse(plan: PlanDef) {
  console.log(`\n🔍 Checking: ${plan.internal_key}`);

  const existing = await findExistingPrice(plan.internal_key);
  if (existing) {
    console.log(`  ✅ REUSED - Price: ${existing.id}, Product: ${existing.product}`);
    return { priceId: existing.id, productId: existing.product as string, reused: true };
  }

  // Create product
  const product = await stripe.products.create({
    name: plan.product_name,
    description: plan.product_description,
    metadata: { internal_key: plan.internal_key, ...plan.metadata },
  });

  // Create price
  const priceParams: Stripe.PriceCreateParams = {
    product: product.id,
    unit_amount: plan.price_amount,
    currency: plan.currency,
    metadata: { internal_key: plan.internal_key, ...plan.metadata },
  };

  if (plan.recurring_interval) {
    priceParams.recurring = { interval: plan.recurring_interval };
  }

  const price = await stripe.prices.create(priceParams);

  console.log(`  🆕 CREATED - Price: ${price.id}, Product: ${product.id}`);
  return { priceId: price.id, productId: product.id, reused: false };
}

async function createCoupon() {
  console.log('\n🔍 Checking coupon: premium_topup_10pct');

  const coupons = await stripe.coupons.list({ limit: 100 });
  const existing = coupons.data.find(c => c.name === 'Premium -10% sur packs crédits');
  if (existing) {
    console.log(`  ✅ REUSED - Coupon: ${existing.id}`);
    return existing.id;
  }

  const coupon = await stripe.coupons.create({
    name: 'Premium -10% sur packs crédits',
    percent_off: 10,
    duration: 'once',
    metadata: { internal_key: 'premium_topup_10pct' },
  });

  console.log(`  🆕 CREATED - Coupon: ${coupon.id}`);
  return coupon.id;
}

async function main() {
  console.log('🚀 NutriZen Stripe Plans Setup (Idempotent)\n');
  console.log('================================================');

  const results: Record<string, { priceId: string; productId: string; reused: boolean }> = {};

  for (const plan of PLANS) {
    results[plan.internal_key] = await createOrReuse(plan);
  }

  const couponId = await createCoupon();

  console.log('\n================================================');
  console.log('📋 SUMMARY\n');

  for (const [key, result] of Object.entries(results)) {
    console.log(`  ${result.reused ? '♻️' : '🆕'} ${key}`);
    console.log(`     Price:   ${result.priceId}`);
    console.log(`     Product: ${result.productId}`);
  }

  console.log(`\n  🎟️  Coupon: ${couponId}`);

  console.log('\n📝 Set these as Supabase secrets:');
  const starterResult = results['nutrizen_starter_monthly_1299'];
  const premiumResult = results['nutrizen_premium_monthly_1999'];
  const t30 = results['nutrizen_topup_30_999'];
  const t80 = results['nutrizen_topup_80_1999'];
  const t200 = results['nutrizen_topup_200_3999'];

  if (starterResult) console.log(`  STRIPE_PRICE_STARTER_MONTHLY=${starterResult.priceId}`);
  if (premiumResult) console.log(`  STRIPE_PRICE_PREMIUM_MONTHLY=${premiumResult.priceId}`);
  if (starterResult) console.log(`  STRIPE_PRODUCT_STARTER=${starterResult.productId}`);
  if (premiumResult) console.log(`  STRIPE_PRODUCT_PREMIUM=${premiumResult.productId}`);
  if (t30) console.log(`  STRIPE_PRICE_TOPUP_30=${t30.priceId}`);
  if (t80) console.log(`  STRIPE_PRICE_TOPUP_80=${t80.priceId}`);
  if (t200) console.log(`  STRIPE_PRICE_TOPUP_200=${t200.priceId}`);
  console.log(`  STRIPE_COUPON_PREMIUM_TOPUP=${couponId}`);

  console.log('\n✅ Done!');
}

main().catch(console.error);
