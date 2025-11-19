-- Add credit type distinction to user_wallets
ALTER TABLE user_wallets
ADD COLUMN IF NOT EXISTS subscription_credits integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS lifetime_credits integer NOT NULL DEFAULT 0;

-- Migrate existing credits_total to subscription_credits
UPDATE user_wallets
SET subscription_credits = credits_total
WHERE subscription_credits = 0 AND credits_total > 0;

-- Add computed column comment (we'll handle total in application logic)
COMMENT ON COLUMN user_wallets.credits_total IS 'Deprecated - use subscription_credits + lifetime_credits';

-- Create credit_transactions table for audit trail
CREATE TABLE IF NOT EXISTS credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delta integer NOT NULL,
  reason text NOT NULL CHECK (reason IN ('purchase', 'subscription_grant', 'usage', 'bonus', 'refund', 'adjustment', 'monthly_reset')),
  credit_type text NOT NULL CHECK (credit_type IN ('subscription', 'lifetime')),
  feature text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_credit_type ON credit_transactions(credit_type);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at DESC);

-- Enable RLS
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for credit_transactions
CREATE POLICY "Users can view own credit transactions"
  ON credit_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert credit transactions"
  ON credit_transactions FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Create function to check and consume credits with priority logic
CREATE OR REPLACE FUNCTION check_and_consume_credits(
  p_user_id uuid,
  p_feature text,
  p_cost integer DEFAULT 1
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_subscription_credits integer;
  v_lifetime_credits integer;
  v_total_available integer;
  v_subscription_used integer := 0;
  v_lifetime_used integer := 0;
  v_new_subscription integer;
  v_new_lifetime integer;
BEGIN
  -- Get current balances with row lock
  SELECT subscription_credits, lifetime_credits
  INTO v_subscription_credits, v_lifetime_credits
  FROM user_wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- If no wallet exists, return insufficient credits
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INSUFFICIENT_CREDITS',
      'message', 'Crédits insuffisants',
      'current_balance', 0,
      'required', p_cost
    );
  END IF;

  v_total_available := v_subscription_credits + v_lifetime_credits;

  -- Check if enough credits
  IF v_total_available < p_cost THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INSUFFICIENT_CREDITS',
      'message', 'Crédits insuffisants',
      'current_balance', v_total_available,
      'required', p_cost,
      'subscription_balance', v_subscription_credits,
      'lifetime_balance', v_lifetime_credits
    );
  END IF;

  -- Use subscription credits first
  IF v_subscription_credits >= p_cost THEN
    v_subscription_used := p_cost;
    v_new_subscription := v_subscription_credits - p_cost;
    v_new_lifetime := v_lifetime_credits;
  ELSE
    -- Use all subscription credits, then lifetime
    v_subscription_used := v_subscription_credits;
    v_lifetime_used := p_cost - v_subscription_credits;
    v_new_subscription := 0;
    v_new_lifetime := v_lifetime_credits - v_lifetime_used;
  END IF;

  -- Update wallet
  UPDATE user_wallets
  SET 
    subscription_credits = v_new_subscription,
    lifetime_credits = v_new_lifetime,
    credits_total = v_new_subscription + v_new_lifetime,
    updated_at = now()
  WHERE user_id = p_user_id;

  -- Log subscription credits usage if any
  IF v_subscription_used > 0 THEN
    INSERT INTO credit_transactions (user_id, delta, reason, credit_type, feature, metadata)
    VALUES (
      p_user_id,
      -v_subscription_used,
      'usage',
      'subscription',
      p_feature,
      jsonb_build_object('consumed', v_subscription_used)
    );
  END IF;

  -- Log lifetime credits usage if any
  IF v_lifetime_used > 0 THEN
    INSERT INTO credit_transactions (user_id, delta, reason, credit_type, feature, metadata)
    VALUES (
      p_user_id,
      -v_lifetime_used,
      'usage',
      'lifetime',
      p_feature,
      jsonb_build_object('consumed', v_lifetime_used)
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'consumed', p_cost,
    'new_balance', v_new_subscription + v_new_lifetime,
    'subscription_balance', v_new_subscription,
    'lifetime_balance', v_new_lifetime
  );
END;
$$;

-- Function to add credits from purchase
CREATE OR REPLACE FUNCTION add_credits_from_purchase(
  p_user_id uuid,
  p_amount integer,
  p_credit_type text DEFAULT 'lifetime',
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_subscription integer;
  v_new_lifetime integer;
  v_new_total integer;
BEGIN
  -- Validate credit type
  IF p_credit_type NOT IN ('subscription', 'lifetime') THEN
    RAISE EXCEPTION 'Invalid credit type: %', p_credit_type;
  END IF;

  -- Upsert wallet
  INSERT INTO user_wallets (user_id, subscription_credits, lifetime_credits, credits_total)
  VALUES (
    p_user_id,
    CASE WHEN p_credit_type = 'subscription' THEN p_amount ELSE 0 END,
    CASE WHEN p_credit_type = 'lifetime' THEN p_amount ELSE 0 END,
    p_amount
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    subscription_credits = CASE 
      WHEN p_credit_type = 'subscription' THEN user_wallets.subscription_credits + p_amount 
      ELSE user_wallets.subscription_credits 
    END,
    lifetime_credits = CASE 
      WHEN p_credit_type = 'lifetime' THEN user_wallets.lifetime_credits + p_amount 
      ELSE user_wallets.lifetime_credits 
    END,
    credits_total = user_wallets.subscription_credits + user_wallets.lifetime_credits +
      CASE WHEN p_credit_type = 'subscription' THEN p_amount ELSE 0 END +
      CASE WHEN p_credit_type = 'lifetime' THEN p_amount ELSE 0 END,
    updated_at = now()
  RETURNING subscription_credits, lifetime_credits, credits_total
  INTO v_new_subscription, v_new_lifetime, v_new_total;

  -- Log transaction
  INSERT INTO credit_transactions (user_id, delta, reason, credit_type, metadata)
  VALUES (p_user_id, p_amount, 'purchase', p_credit_type, p_metadata);

  RETURN jsonb_build_object(
    'success', true,
    'subscription_balance', v_new_subscription,
    'lifetime_balance', v_new_lifetime,
    'total_balance', v_new_total
  );
END;
$$;