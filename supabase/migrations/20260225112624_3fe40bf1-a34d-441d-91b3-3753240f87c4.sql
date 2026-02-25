
-- ============================================================
-- Migration: New pricing schema for NutriZen v2
-- Adds plan_tier/welcome_credits to profiles, extends credit_transactions
-- for Stripe traceability, adds idempotency indexes
-- ============================================================

-- 1) Add plan_tier and welcome_credits_granted to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan_tier text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS welcome_credits_granted boolean NOT NULL DEFAULT false;

-- 2) Add rollover_cap and subscription period tracking to user_wallets
ALTER TABLE public.user_wallets
  ADD COLUMN IF NOT EXISTS rollover_cap integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_period_start timestamptz,
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz;

-- 3) Extend credit_transactions with Stripe event traceability
ALTER TABLE public.credit_transactions
  ADD COLUMN IF NOT EXISTS stripe_event_id text,
  ADD COLUMN IF NOT EXISTS stripe_invoice_id text,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS period_start timestamptz,
  ADD COLUMN IF NOT EXISTS period_end timestamptz;

-- 4) Idempotency indexes on credit_transactions
-- Unique on stripe_event_id (prevents double-processing of same Stripe event)
CREATE UNIQUE INDEX IF NOT EXISTS idx_ct_stripe_event_id
  ON public.credit_transactions (stripe_event_id)
  WHERE stripe_event_id IS NOT NULL;

-- Unique on stripe_payment_intent_id (prevents double top-up grants)
CREATE UNIQUE INDEX IF NOT EXISTS idx_ct_stripe_payment_intent_id
  ON public.credit_transactions (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

-- Unique subscription refill per user per period (prevents double monthly refills)
CREATE UNIQUE INDEX IF NOT EXISTS idx_ct_subscription_refill_unique
  ON public.credit_transactions (user_id, reason, period_start, period_end)
  WHERE reason = 'subscription_refill';

-- 5) Update feature_costs table with new costs
UPDATE public.feature_costs SET cost = 1 WHERE feature = 'swap';
UPDATE public.feature_costs SET cost = 4 WHERE feature = 'scan_repas';
UPDATE public.feature_costs SET cost = 6 WHERE feature = 'inspi_frigo';
UPDATE public.feature_costs SET cost = 1 WHERE feature = 'substitutions';

-- Insert new features if not existing
INSERT INTO public.feature_costs (feature, cost, description)
VALUES
  ('generate_meal', 1, 'Générer 1 repas'),
  ('generate_week_1', 6, 'Générer semaine 1 repas/jour (7 repas)'),
  ('generate_week_2', 11, 'Générer semaine 2 repas/jour (14 repas)'),
  ('regenerate_day', 2, 'Regénérer un jour'),
  ('regenerate_week', 8, 'Regénérer semaine complète')
ON CONFLICT (feature) DO UPDATE SET cost = EXCLUDED.cost, description = EXCLUDED.description;

-- 6) Create consume_credits RPC (server-side authoritative, anti-cheat)
CREATE OR REPLACE FUNCTION public.consume_credits(
  p_feature text,
  p_amount integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
  v_wallet RECORD;
  v_sub_used integer := 0;
  v_life_used integer := 0;
  v_new_sub integer;
  v_new_life integer;
BEGIN
  -- Only the authenticated user can consume their own credits
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'UNAUTHORIZED', 'message', 'Non authentifié');
  END IF;

  -- Lock wallet row
  SELECT * INTO v_wallet
  FROM public.user_wallets
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INSUFFICIENT_CREDITS',
      'message', 'Crédits insuffisants',
      'current_balance', 0,
      'required', p_amount
    );
  END IF;

  -- Check total balance
  IF (v_wallet.subscription_credits + v_wallet.lifetime_credits) < p_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INSUFFICIENT_CREDITS',
      'message', 'Crédits insuffisants',
      'current_balance', v_wallet.subscription_credits + v_wallet.lifetime_credits,
      'required', p_amount
    );
  END IF;

  -- Consume subscription credits first, then lifetime
  IF v_wallet.subscription_credits >= p_amount THEN
    v_sub_used := p_amount;
  ELSE
    v_sub_used := v_wallet.subscription_credits;
    v_life_used := p_amount - v_wallet.subscription_credits;
  END IF;

  v_new_sub := v_wallet.subscription_credits - v_sub_used;
  v_new_life := v_wallet.lifetime_credits - v_life_used;

  -- Update wallet
  UPDATE public.user_wallets
  SET subscription_credits = v_new_sub,
      lifetime_credits = v_new_life,
      credits_total = v_new_sub + v_new_life,
      balance = v_new_sub + v_new_life,
      balance_allowance = v_new_sub,
      balance_purchased = v_new_life,
      updated_at = now()
  WHERE user_id = v_user_id;

  -- Insert ledger entries
  IF v_sub_used > 0 THEN
    INSERT INTO public.credit_transactions
      (user_id, delta, reason, credit_type, feature)
    VALUES
      (v_user_id, -v_sub_used, 'feature_consume', 'subscription', p_feature);
  END IF;

  IF v_life_used > 0 THEN
    INSERT INTO public.credit_transactions
      (user_id, delta, reason, credit_type, feature)
    VALUES
      (v_user_id, -v_life_used, 'feature_consume', 'lifetime', p_feature);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'consumed', p_amount,
    'new_balance', v_new_sub + v_new_life,
    'subscription_balance', v_new_sub,
    'lifetime_balance', v_new_life
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.consume_credits(text, integer) TO authenticated;

-- 7) Create welcome_credits function (grants 14 credits once)
CREATE OR REPLACE FUNCTION public.grant_welcome_credits(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_already_granted boolean;
BEGIN
  -- Check if already granted
  SELECT welcome_credits_granted INTO v_already_granted
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_already_granted IS TRUE THEN
    RETURN jsonb_build_object('success', true, 'already_granted', true, 'credits', 0);
  END IF;

  -- Create wallet if needed
  INSERT INTO public.user_wallets (user_id, subscription_credits, lifetime_credits, credits_total, balance, balance_purchased, balance_allowance)
  VALUES (p_user_id, 0, 14, 14, 14, 14, 0)
  ON CONFLICT (user_id) DO UPDATE
  SET lifetime_credits = public.user_wallets.lifetime_credits + 14,
      credits_total = public.user_wallets.credits_total + 14,
      balance = public.user_wallets.balance + 14,
      balance_purchased = public.user_wallets.balance_purchased + 14,
      updated_at = now();

  -- Log transaction
  INSERT INTO public.credit_transactions (user_id, delta, reason, credit_type, feature)
  VALUES (p_user_id, 14, 'welcome_credits', 'lifetime', null);

  -- Mark as granted
  UPDATE public.profiles SET welcome_credits_granted = true WHERE id = p_user_id;

  RETURN jsonb_build_object('success', true, 'already_granted', false, 'credits', 14);
END;
$$;

GRANT EXECUTE ON FUNCTION public.grant_welcome_credits(uuid) TO service_role;

-- 8) Update credit_packs table with new top-up packs
DELETE FROM public.credit_packs WHERE id NOT IN ('topup_30', 'topup_80', 'topup_200');

INSERT INTO public.credit_packs (id, name, credits, price_cents, currency, sort_order, active)
VALUES
  ('topup_30', 'Pack 30 crédits', 30, 999, 'eur', 1, true),
  ('topup_80', 'Pack 80 crédits', 80, 1999, 'eur', 2, true),
  ('topup_200', 'Pack 200 crédits', 200, 3999, 'eur', 3, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  credits = EXCLUDED.credits,
  price_cents = EXCLUDED.price_cents,
  sort_order = EXCLUDED.sort_order,
  active = EXCLUDED.active;

-- Deactivate old packs
UPDATE public.credit_packs SET active = false WHERE id NOT IN ('topup_30', 'topup_80', 'topup_200');
