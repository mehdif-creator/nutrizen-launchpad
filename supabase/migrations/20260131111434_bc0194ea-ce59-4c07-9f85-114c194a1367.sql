-- =============================================
-- Feature Flag: subscription_off (default true)
-- =============================================
INSERT INTO public.feature_flags (key, enabled, description)
VALUES ('subscription_off', true, 'When enabled, hides all subscription UI and only shows Credits Zen purchasing. Core product is free.')
ON CONFLICT (key) DO UPDATE SET enabled = true, description = EXCLUDED.description;

-- =============================================
-- Enhanced Credit System with Idempotency
-- =============================================

-- Add idempotency_key column to credit_transactions if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'credit_transactions' AND column_name = 'idempotency_key'
  ) THEN
    ALTER TABLE public.credit_transactions 
    ADD COLUMN idempotency_key TEXT;
  END IF;
END $$;

-- Add reference_type and reference_id columns for tracking
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'credit_transactions' AND column_name = 'reference_type'
  ) THEN
    ALTER TABLE public.credit_transactions 
    ADD COLUMN reference_type TEXT,
    ADD COLUMN reference_id TEXT;
  END IF;
END $$;

-- Create unique index on idempotency_key for atomic operations
CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_transactions_idempotency_key 
ON public.credit_transactions(idempotency_key) 
WHERE idempotency_key IS NOT NULL;

-- Create composite unique index for reference tracking
CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_transactions_reference 
ON public.credit_transactions(reference_type, reference_id) 
WHERE reference_type IS NOT NULL AND reference_id IS NOT NULL;

-- Add balance tracking columns to user_wallets if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_wallets' AND column_name = 'balance'
  ) THEN
    -- Add balance column that combines subscription + lifetime credits
    ALTER TABLE public.user_wallets 
    ADD COLUMN balance INTEGER GENERATED ALWAYS AS (subscription_credits + lifetime_credits) STORED;
  END IF;
END $$;

-- =============================================
-- Atomic Idempotent Credit Transaction Function
-- =============================================
CREATE OR REPLACE FUNCTION public.rpc_apply_credit_transaction(
  p_user_id UUID,
  p_type TEXT,
  p_amount INTEGER,
  p_reason TEXT DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL,
  p_feature TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet RECORD;
  v_existing RECORD;
  v_new_subscription INTEGER;
  v_new_lifetime INTEGER;
  v_actual_amount INTEGER;
  v_credit_type TEXT;
BEGIN
  -- Check idempotency first (if key provided)
  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_existing 
    FROM credit_transactions 
    WHERE idempotency_key = p_idempotency_key;
    
    IF FOUND THEN
      -- Return existing transaction result
      RETURN jsonb_build_object(
        'success', true,
        'idempotent_hit', true,
        'transaction_id', v_existing.id,
        'amount', v_existing.delta,
        'message', 'Transaction already processed'
      );
    END IF;
  END IF;
  
  -- Lock wallet row for update (prevents race conditions)
  SELECT * INTO v_wallet 
  FROM user_wallets 
  WHERE user_id = p_user_id 
  FOR UPDATE;
  
  -- Create wallet if doesn't exist
  IF NOT FOUND THEN
    INSERT INTO user_wallets (user_id, subscription_credits, lifetime_credits)
    VALUES (p_user_id, 0, 0)
    RETURNING * INTO v_wallet;
  END IF;
  
  -- Handle based on transaction type
  CASE p_type
    WHEN 'purchase', 'grant', 'refund' THEN
      -- Add credits (always to lifetime for purchases/grants)
      v_new_lifetime := v_wallet.lifetime_credits + p_amount;
      v_new_subscription := v_wallet.subscription_credits;
      v_actual_amount := p_amount;
      v_credit_type := 'lifetime';
      
    WHEN 'spend' THEN
      -- Consume credits: subscription first, then lifetime
      IF (v_wallet.subscription_credits + v_wallet.lifetime_credits) < ABS(p_amount) THEN
        RETURN jsonb_build_object(
          'success', false,
          'error_code', 'INSUFFICIENT_CREDITS',
          'current_balance', v_wallet.subscription_credits + v_wallet.lifetime_credits,
          'required', ABS(p_amount),
          'message', 'Crédits insuffisants'
        );
      END IF;
      
      v_actual_amount := ABS(p_amount);
      
      -- Deduct from subscription first
      IF v_wallet.subscription_credits >= v_actual_amount THEN
        v_new_subscription := v_wallet.subscription_credits - v_actual_amount;
        v_new_lifetime := v_wallet.lifetime_credits;
        v_credit_type := 'subscription';
      ELSE
        -- Use all subscription, then lifetime
        v_new_subscription := 0;
        v_new_lifetime := v_wallet.lifetime_credits - (v_actual_amount - v_wallet.subscription_credits);
        v_credit_type := 'mixed';
      END IF;
      
      -- Store as negative for spend
      v_actual_amount := -v_actual_amount;
      
    WHEN 'adjustment' THEN
      -- Admin adjustment - can be positive or negative
      IF p_amount >= 0 THEN
        v_new_lifetime := v_wallet.lifetime_credits + p_amount;
        v_new_subscription := v_wallet.subscription_credits;
      ELSE
        -- Negative adjustment from lifetime first
        IF v_wallet.lifetime_credits >= ABS(p_amount) THEN
          v_new_lifetime := v_wallet.lifetime_credits + p_amount;
          v_new_subscription := v_wallet.subscription_credits;
        ELSE
          v_new_lifetime := 0;
          v_new_subscription := v_wallet.subscription_credits + (p_amount + v_wallet.lifetime_credits);
        END IF;
      END IF;
      v_actual_amount := p_amount;
      v_credit_type := 'adjustment';
      
    ELSE
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'INVALID_TYPE',
        'message', 'Type de transaction invalide'
      );
  END CASE;
  
  -- Ensure balances don't go negative
  IF v_new_subscription < 0 OR v_new_lifetime < 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'BALANCE_ERROR',
      'message', 'Solde insuffisant'
    );
  END IF;
  
  -- Insert transaction record
  INSERT INTO credit_transactions (
    user_id, 
    delta, 
    reason, 
    credit_type,
    feature,
    idempotency_key,
    reference_type,
    reference_id,
    metadata
  )
  VALUES (
    p_user_id,
    v_actual_amount,
    COALESCE(p_reason, p_type),
    v_credit_type,
    p_feature,
    p_idempotency_key,
    p_reference_type,
    p_reference_id,
    jsonb_build_object('type', p_type)
  );
  
  -- Update wallet
  UPDATE user_wallets 
  SET 
    subscription_credits = v_new_subscription,
    lifetime_credits = v_new_lifetime,
    lifetime_credits_earned = CASE 
      WHEN p_type IN ('purchase', 'grant') THEN lifetime_credits_earned + p_amount 
      ELSE lifetime_credits_earned 
    END,
    updated_at = now()
  WHERE user_id = p_user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'idempotent_hit', false,
    'type', p_type,
    'amount', v_actual_amount,
    'subscription_balance', v_new_subscription,
    'lifetime_balance', v_new_lifetime,
    'total_balance', v_new_subscription + v_new_lifetime
  );
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION public.rpc_apply_credit_transaction TO service_role;

-- =============================================
-- Credit Packs Configuration Table
-- =============================================
CREATE TABLE IF NOT EXISTS public.credit_packs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  credits INTEGER NOT NULL,
  price_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'eur',
  stripe_price_id TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.credit_packs ENABLE ROW LEVEL SECURITY;

-- Public read access for credit packs
CREATE POLICY "Anyone can view active credit packs"
ON public.credit_packs
FOR SELECT
USING (active = true);

-- Admin can manage credit packs
CREATE POLICY "Admins can manage credit packs"
ON public.credit_packs
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default credit packs
INSERT INTO public.credit_packs (id, name, credits, price_cents, stripe_price_id, sort_order)
VALUES 
  ('pack_s', 'Pack S', 50, 499, NULL, 1),
  ('pack_m', 'Pack M', 120, 999, NULL, 2),
  ('pack_l', 'Pack L', 300, 1999, NULL, 3),
  ('pack_xl', 'Pack XL', 700, 3999, NULL, 4)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  credits = EXCLUDED.credits,
  price_cents = EXCLUDED.price_cents;

-- =============================================
-- Payment Events Log for Observability
-- =============================================
CREATE TABLE IF NOT EXISTS public.payment_events_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  stripe_event_id TEXT,
  user_id UUID,
  user_email TEXT,
  amount_cents INTEGER,
  credits_amount INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_events_log ENABLE ROW LEVEL SECURITY;

-- Only service role can insert/manage
CREATE POLICY "Service role can manage payment logs"
ON public.payment_events_log
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Admins can view payment logs
CREATE POLICY "Admins can view payment logs"
ON public.payment_events_log
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for lookups
CREATE INDEX IF NOT EXISTS idx_payment_events_stripe_event 
ON public.payment_events_log(stripe_event_id);

CREATE INDEX IF NOT EXISTS idx_payment_events_user 
ON public.payment_events_log(user_id);