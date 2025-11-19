# Zen Credits Stripe Configuration

## Overview
This document explains how to configure Stripe for the Zen Credits purchase feature (Crédits Zen x15).

## Quick Setup

### 1. Create the Product in Stripe Dashboard

1. Go to your [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Products** → **Add Product**
3. Create a new product with these details:
   - **Name**: `Crédits Zen x15`
   - **Description**: `15 crédits non expirants pour NutriZen`
   - **Price**: `4.99 EUR`
   - **Type**: **One-time payment** (not recurring)

4. After creating the product, copy the **Price ID** (format: `price_xxxxx...`)

### 2. Add the Price ID to Supabase Secrets

The Zen Credits price ID is stored as a Supabase secret named `ZEN_CREDITS_PRICE_ID`.

**This secret has already been configured via the Lovable interface.**

If you need to update it later:
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `pghdaozgxkbtsxwydemd`
3. Navigate to **Edge Functions** → **Manage secrets**
4. Update the `ZEN_CREDITS_PRICE_ID` with your new Stripe price ID

### 3. Webhook Configuration (Already Set Up)

The Stripe webhook at `supabase/functions/stripe-webhook/index.ts` is already configured to handle:
- Credit pack purchases (lines 101-150)
- Lifetime credits allocation
- User wallet updates

When a user completes a Zen Credits purchase, the webhook:
1. Detects the `credits_type: 'lifetime'` metadata
2. Calls the `add_credits_from_purchase` RPC function
3. Adds 15 lifetime (non-expiring) credits to the user's wallet
4. Records the transaction in `credit_transactions` table

## Testing

### Test Mode
1. Use a Stripe test price ID for development
2. Use Stripe test card: `4242 4242 4242 4242`
3. Any future expiry date, any CVC

### Live Mode
1. Ensure your Stripe account is activated
2. Replace test price ID with live price ID in the `ZEN_CREDITS_PRICE_ID` secret
3. Update `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` for live mode

## Current Implementation

### Edge Function: `create-credits-checkout`
- **Location**: `supabase/functions/create-credits-checkout/index.ts`
- **Purpose**: Creates a Stripe Checkout session for Zen Credits purchase
- **Authentication**: Required (uses Supabase auth token)
- **Price ID Source**: `ZEN_CREDITS_PRICE_ID` environment variable
- **Fallback**: `price_1QVN8jEl2hJeGlFpJXYqvZx7` (must be replaced with your actual price ID)

### Frontend Component: `BuyCreditsSection`
- **Location**: `src/components/app/BuyCreditsSection.tsx`
- **Features**:
  - Displays Zen Credits pack details
  - Shows price (4.99€)
  - Handles loading states
  - Better error messages
  - Redirects to Stripe Checkout

### Webhook Handler: `stripe-webhook`
- **Location**: `supabase/functions/stripe-webhook/index.ts`
- **Handles**: `checkout.session.completed` events
- **Metadata Required**:
  - `supabase_user_id`: User's UUID
  - `credits_type`: "lifetime"
  - `credits_amount`: "15"
  - `product_role`: "zen_credits_pack"

## Troubleshooting

### Error: "No such price: 'price_xxxxx'"
**Solution**: Update the `ZEN_CREDITS_PRICE_ID` secret with your actual Stripe price ID.

### Credits Not Added After Payment
**Check**:
1. Webhook is receiving events (check Stripe Dashboard → Developers → Webhooks)
2. Webhook signature is valid (`STRIPE_WEBHOOK_SECRET` is correct)
3. Check Supabase Edge Function logs for `stripe-webhook` errors
4. Verify `user_wallets` table has a record for the user

### Checkout Session Not Creating
**Check**:
1. User is authenticated (has valid session)
2. `STRIPE_SECRET_KEY` is set correctly
3. Price ID exists in your Stripe account
4. Check `create-credits-checkout` function logs

## Architecture

```
User clicks "Acheter maintenant"
  ↓
BuyCreditsSection.handleBuyCredits()
  ↓
supabase.functions.invoke('create-credits-checkout')
  ↓
Stripe Checkout Session Created
  ↓
User completes payment on Stripe
  ↓
Stripe webhook → stripe-webhook edge function
  ↓
add_credits_from_purchase(user_id, 15, 'lifetime', metadata)
  ↓
user_wallets.lifetime_credits += 15
user_credit_lots created (15 credits, expires: 1 year from now)
credit_transactions logged
  ↓
User redirected to /app/dashboard?credits_purchased=true
  ↓
Dashboard shows success toast
```

## Support

If you encounter issues:
1. Check Edge Function logs: Supabase Dashboard → Edge Functions → Logs
2. Check Stripe webhook logs: Stripe Dashboard → Developers → Webhooks
3. Verify all secrets are set correctly
4. Contact support with error logs and session ID
