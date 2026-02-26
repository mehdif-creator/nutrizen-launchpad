/**
 * Idempotent Stripe Price Metadata Patch Script for NutriZen
 *
 * Ensures all known prices have required metadata fields.
 * Safe to run multiple times — only patches missing/wrong fields.
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_test_xxx npx tsx scripts/stripe_patch_metadata.ts
 *
 * Optionally set env vars for price IDs, or use the defaults from stripe_create_plans.ts.
 */

import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY is required');
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2025-08-27.basil' as any });

interface PricePatch {
  envKey: string;          // env var holding the price ID
  fallbackId?: string;     // hardcoded fallback if env not set
  requiredMetadata: Record<string, string>;
}

const PRICE_PATCHES: PricePatch[] = [
  {
    envKey: 'STRIPE_PRICE_STARTER_MONTHLY',
    requiredMetadata: {
      internal_key: 'nutrizen_starter_monthly_1299',
      plan_tier: 'starter',
      credits_monthly: '80',
      rollover_cap: '20',
      priority_generation: 'false',
      topup_discount_pct: '0',
    },
  },
  {
    envKey: 'STRIPE_PRICE_PREMIUM_MONTHLY',
    requiredMetadata: {
      internal_key: 'nutrizen_premium_monthly_1999',
      plan_tier: 'premium',
      credits_monthly: '200',
      rollover_cap: '80',
      priority_generation: 'true',
      topup_discount_pct: '10',
    },
  },
  {
    envKey: 'STRIPE_PRICE_TOPUP_30',
    requiredMetadata: {
      internal_key: 'nutrizen_topup_30_999',
      topup_credits: '30',
    },
  },
  {
    envKey: 'STRIPE_PRICE_TOPUP_80',
    requiredMetadata: {
      internal_key: 'nutrizen_topup_80_1999',
      topup_credits: '80',
    },
  },
  {
    envKey: 'STRIPE_PRICE_TOPUP_200',
    requiredMetadata: {
      internal_key: 'nutrizen_topup_200_3999',
      topup_credits: '200',
    },
  },
];

async function patchPrice(patch: PricePatch) {
  const priceId = process.env[patch.envKey] || patch.fallbackId;
  if (!priceId) {
    console.log(`  ⏭️  SKIPPED ${patch.envKey} — no price ID found in env`);
    return;
  }

  console.log(`\n🔍 Checking ${patch.envKey} (${priceId})`);

  try {
    const price = await stripe.prices.retrieve(priceId);
    const existingMeta = price.metadata || {};

    // Find missing or mismatched fields
    const updates: Record<string, string> = {};
    for (const [key, value] of Object.entries(patch.requiredMetadata)) {
      if (existingMeta[key] !== value) {
        updates[key] = value;
      }
    }

    if (Object.keys(updates).length === 0) {
      console.log(`  ✅ Already correct — no changes needed`);
      return;
    }

    // Merge with existing metadata (don't remove other keys)
    const mergedMeta = { ...existingMeta, ...updates };
    await stripe.prices.update(priceId, { metadata: mergedMeta });

    console.log(`  🔧 PATCHED — Updated fields: ${Object.keys(updates).join(', ')}`);

    // Also patch the product metadata to match
    if (price.product && typeof price.product === 'string') {
      await stripe.products.update(price.product, {
        metadata: { ...updates },
      });
      console.log(`  🔧 Product ${price.product} metadata also patched`);
    }
  } catch (err) {
    console.error(`  ❌ ERROR patching ${priceId}:`, err);
  }
}

async function main() {
  console.log('🚀 NutriZen Stripe Metadata Patcher (Idempotent)\n');
  console.log('================================================');

  for (const patch of PRICE_PATCHES) {
    await patchPrice(patch);
  }

  console.log('\n================================================');
  console.log('✅ Metadata patch complete!');
}

main().catch(console.error);
