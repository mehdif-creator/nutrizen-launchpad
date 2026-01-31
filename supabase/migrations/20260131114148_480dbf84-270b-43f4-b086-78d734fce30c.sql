-- ==========================================
-- 1. CREDITS RESET SYSTEM (weekly/monthly)
-- ==========================================

-- Add reset fields to user_wallets
ALTER TABLE user_wallets 
  ADD COLUMN IF NOT EXISTS balance_purchased integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance_allowance integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reset_cadence text NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS allowance_amount integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_reset_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_reset_at timestamptz;

-- Add constraint for reset_cadence
ALTER TABLE user_wallets DROP CONSTRAINT IF EXISTS user_wallets_reset_cadence_check;
ALTER TABLE user_wallets ADD CONSTRAINT user_wallets_reset_cadence_check 
  CHECK (reset_cadence IN ('weekly', 'monthly', 'none'));

-- Create credit_resets_log table
CREATE TABLE IF NOT EXISTS credit_resets_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cadence text NOT NULL CHECK (cadence IN ('weekly', 'monthly')),
  period_key text NOT NULL,
  granted_amount integer NOT NULL,
  idempotency_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Unique constraints for idempotency
CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_resets_log_idempotency 
  ON credit_resets_log (user_id, idempotency_key);
CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_resets_log_period 
  ON credit_resets_log (user_id, cadence, period_key);

-- RLS for credit_resets_log
ALTER TABLE credit_resets_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own reset logs" ON credit_resets_log;
CREATE POLICY "Users can view own reset logs" ON credit_resets_log
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage reset logs" ON credit_resets_log;
CREATE POLICY "Service role can manage reset logs" ON credit_resets_log
  FOR ALL USING (auth.role() = 'service_role');

-- ==========================================
-- 2. ONBOARDING STATE MACHINE
-- ==========================================

-- Add onboarding fields to user_profiles
ALTER TABLE user_profiles 
  ADD COLUMN IF NOT EXISTS onboarding_status text NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS onboarding_version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS required_fields_ok boolean NOT NULL DEFAULT false;

-- Add constraint for onboarding_status
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_onboarding_status_check;
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_onboarding_status_check 
  CHECK (onboarding_status IN ('not_started', 'in_progress', 'completed'));

-- ==========================================
-- 3. PORTIONS PER MEAL (deterministic)
-- ==========================================

-- Add portion fields to user_profiles
ALTER TABLE user_profiles 
  ADD COLUMN IF NOT EXISTS kid_portion_ratio numeric NOT NULL DEFAULT 0.6,
  ADD COLUMN IF NOT EXISTS meals_per_day integer NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS default_servings_per_recipe integer NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS portion_strategy text NOT NULL DEFAULT 'household';

-- Add constraint for portion_strategy
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_portion_strategy_check;
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_portion_strategy_check 
  CHECK (portion_strategy IN ('household', 'single', 'custom'));

-- ==========================================
-- 4. RPC: Compute reset state (timezone-safe)
-- ==========================================

CREATE OR REPLACE FUNCTION rpc_compute_reset_state(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet record;
  v_period_key text;
  v_period_start timestamptz;
  v_next_reset_at timestamptz;
  v_is_due boolean := false;
  v_tz text := 'Europe/Paris';
BEGIN
  -- Get wallet data
  SELECT reset_cadence, allowance_amount, last_reset_at, next_reset_at
  INTO v_wallet
  FROM user_wallets
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'is_due', false,
      'error', 'wallet_not_found'
    );
  END IF;
  
  -- Skip if cadence is none
  IF v_wallet.reset_cadence = 'none' THEN
    RETURN jsonb_build_object(
      'is_due', false,
      'cadence', 'none',
      'allowance_amount', 0
    );
  END IF;
  
  -- Calculate period key and boundaries based on cadence
  IF v_wallet.reset_cadence = 'weekly' THEN
    -- ISO week format: YYYY-Www (e.g., 2026-W05)
    v_period_key := to_char(now() AT TIME ZONE v_tz, 'IYYY"-W"IW');
    -- Get Monday 00:00 of current week
    v_period_start := date_trunc('week', (now() AT TIME ZONE v_tz)::date)::timestamptz;
    -- Next reset is next Monday
    v_next_reset_at := v_period_start + interval '7 days';
  ELSE
    -- Monthly format: YYYY-MM
    v_period_key := to_char(now() AT TIME ZONE v_tz, 'YYYY-MM');
    -- Get 1st of current month 00:00
    v_period_start := date_trunc('month', (now() AT TIME ZONE v_tz)::date)::timestamptz;
    -- Next reset is 1st of next month
    v_next_reset_at := v_period_start + interval '1 month';
  END IF;
  
  -- Check if reset is due
  v_is_due := (
    v_wallet.last_reset_at IS NULL 
    OR v_wallet.last_reset_at < v_period_start
  );
  
  RETURN jsonb_build_object(
    'is_due', v_is_due,
    'cadence', v_wallet.reset_cadence,
    'period_key', v_period_key,
    'period_start', v_period_start,
    'next_reset_at', v_next_reset_at,
    'allowance_amount', v_wallet.allowance_amount
  );
END;
$$;

-- ==========================================
-- 5. RPC: Apply credit reset (atomic + idempotent)
-- ==========================================

CREATE OR REPLACE FUNCTION rpc_apply_credit_reset(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet record;
  v_reset_state jsonb;
  v_is_due boolean;
  v_cadence text;
  v_period_key text;
  v_allowance integer;
  v_next_reset timestamptz;
  v_idempotency_key text;
BEGIN
  -- Lock wallet row
  SELECT * INTO v_wallet
  FROM user_wallets
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'wallet_not_found'
    );
  END IF;
  
  -- Get reset state
  v_reset_state := rpc_compute_reset_state(p_user_id);
  v_is_due := (v_reset_state->>'is_due')::boolean;
  v_cadence := v_reset_state->>'cadence';
  v_period_key := v_reset_state->>'period_key';
  v_allowance := (v_reset_state->>'allowance_amount')::integer;
  v_next_reset := (v_reset_state->>'next_reset_at')::timestamptz;
  
  -- If not due, return current state
  IF NOT v_is_due THEN
    RETURN jsonb_build_object(
      'success', true,
      'action', 'no_reset_needed',
      'balance_allowance', v_wallet.balance_allowance,
      'balance_purchased', v_wallet.balance_purchased,
      'next_reset_at', v_wallet.next_reset_at
    );
  END IF;
  
  -- Build idempotency key
  v_idempotency_key := format('reset:%s:%s:%s', v_cadence, v_period_key, p_user_id);
  
  -- Check if already processed (idempotency)
  IF EXISTS (
    SELECT 1 FROM credit_resets_log 
    WHERE user_id = p_user_id AND idempotency_key = v_idempotency_key
  ) THEN
    RETURN jsonb_build_object(
      'success', true,
      'action', 'already_processed',
      'balance_allowance', v_wallet.balance_allowance,
      'balance_purchased', v_wallet.balance_purchased,
      'next_reset_at', v_wallet.next_reset_at
    );
  END IF;
  
  -- Apply reset: set balance_allowance to allowance_amount
  UPDATE user_wallets
  SET 
    balance_allowance = v_allowance,
    last_reset_at = now(),
    next_reset_at = v_next_reset,
    updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Log the reset
  INSERT INTO credit_resets_log (user_id, cadence, period_key, granted_amount, idempotency_key)
  VALUES (p_user_id, v_cadence, v_period_key, v_allowance, v_idempotency_key);
  
  -- Record transaction in credit_transactions
  INSERT INTO credit_transactions (user_id, credit_type, delta, reason, feature, idempotency_key)
  VALUES (
    p_user_id, 
    'allowance', 
    v_allowance, 
    format('Reset %s (%s)', v_cadence, v_period_key),
    'credit_reset',
    v_idempotency_key
  );
  
  -- Also sync to dashboard stats for backward compatibility
  UPDATE user_dashboard_stats
  SET credits_zen = v_allowance + v_wallet.balance_purchased
  WHERE user_id = p_user_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'action', 'reset_applied',
    'balance_allowance', v_allowance,
    'balance_purchased', v_wallet.balance_purchased,
    'period_key', v_period_key,
    'next_reset_at', v_next_reset
  );
END;
$$;

-- ==========================================
-- 6. RPC: Get effective portions
-- ==========================================

CREATE OR REPLACE FUNCTION rpc_get_effective_portions(p_user_id uuid, p_week_start date DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile record;
  v_effective_servings numeric;
  v_rounded_servings integer;
BEGIN
  -- Get profile data
  SELECT 
    household_adults,
    household_children,
    kid_portion_ratio,
    portion_strategy,
    default_servings_per_recipe
  INTO v_profile
  FROM user_profiles
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    -- Return defaults
    RETURN jsonb_build_object(
      'effective_servings_per_meal', 2,
      'rounded_servings', 2,
      'servings_breakdown', jsonb_build_object(
        'adults', 1,
        'children', 0,
        'kid_portion_ratio', 0.6
      ),
      'profile_complete', false
    );
  END IF;
  
  -- Calculate effective servings based on strategy
  CASE v_profile.portion_strategy
    WHEN 'single' THEN
      v_effective_servings := 1;
    WHEN 'custom' THEN
      v_effective_servings := v_profile.default_servings_per_recipe;
    ELSE -- 'household'
      v_effective_servings := v_profile.household_adults + 
        (v_profile.household_children * v_profile.kid_portion_ratio);
  END CASE;
  
  -- Round to nearest 0.5, minimum 1
  v_rounded_servings := GREATEST(1, ROUND(v_effective_servings));
  
  RETURN jsonb_build_object(
    'effective_servings_per_meal', v_effective_servings,
    'rounded_servings', v_rounded_servings,
    'servings_breakdown', jsonb_build_object(
      'adults', v_profile.household_adults,
      'children', v_profile.household_children,
      'kid_portion_ratio', v_profile.kid_portion_ratio
    ),
    'portion_strategy', v_profile.portion_strategy,
    'profile_complete', true
  );
END;
$$;

-- ==========================================
-- 7. Add servings_used to menu storage
-- ==========================================

-- Add servings_used to user_weekly_menus payload
-- Note: This is stored in the JSONB payload, so no schema change needed
-- But we'll add a helper function to validate/extract it

CREATE OR REPLACE FUNCTION get_menu_servings_used(p_payload jsonb, p_day text DEFAULT NULL)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_days jsonb;
  v_day jsonb;
BEGIN
  v_days := p_payload->'days';
  
  IF p_day IS NULL THEN
    -- Return first day's servings as default
    v_day := v_days->0;
  ELSE
    -- Find specific day
    SELECT d INTO v_day
    FROM jsonb_array_elements(v_days) d
    WHERE d->>'day' = p_day
    LIMIT 1;
  END IF;
  
  RETURN COALESCE((v_day->>'servings_used')::numeric, 2);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION rpc_compute_reset_state(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_apply_credit_reset(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_get_effective_portions(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION get_menu_servings_used(jsonb, text) TO authenticated;