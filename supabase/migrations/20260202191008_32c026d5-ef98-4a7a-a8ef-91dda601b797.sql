-- ================================================================
-- PART 7: Automation Jobs Pipeline Table
-- ================================================================

-- Create automation_jobs table for reliable job tracking
CREATE TABLE IF NOT EXISTS public.automation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('scan_repas', 'inspi_frigo', 'substitutions')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'success', 'error', 'canceled')),
  idempotency_key text NOT NULL,
  result jsonb NULL,
  error text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT automation_jobs_user_idempotency_unique UNIQUE (user_id, idempotency_key)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_automation_jobs_user_created ON public.automation_jobs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_automation_jobs_status_created ON public.automation_jobs (status, created_at);

-- Enable RLS
ALTER TABLE public.automation_jobs ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view their own jobs
CREATE POLICY "Users can view own automation jobs"
  ON public.automation_jobs
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS: Users can insert their own jobs (through Edge Function validation)
CREATE POLICY "Users can insert own automation jobs"
  ON public.automation_jobs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS: Only service role can update jobs (for callbacks)
CREATE POLICY "Service role can update automation jobs"
  ON public.automation_jobs
  FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- RLS: Admins can view all jobs
CREATE POLICY "Admins can view all automation jobs"
  ON public.automation_jobs
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS automation_jobs_updated_at ON public.automation_jobs;
CREATE TRIGGER automation_jobs_updated_at
  BEFORE UPDATE ON public.automation_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();

-- ================================================================
-- PART 9: Credit economy constants table (for consistent cost lookup)
-- ================================================================

-- Create a table for feature costs (admin-managed)
CREATE TABLE IF NOT EXISTS public.feature_costs (
  feature text PRIMARY KEY,
  cost integer NOT NULL DEFAULT 1,
  description text,
  updated_at timestamptz DEFAULT now()
);

-- Insert/update feature costs
INSERT INTO public.feature_costs (feature, cost, description) VALUES
  ('swap', 1, 'Changer une recette'),
  ('scan_repas', 2, 'Analyser un repas photo'),
  ('inspi_frigo', 2, 'Recette à partir du frigo'),
  ('substitutions', 1, 'Alternatives ingrédient')
ON CONFLICT (feature) DO UPDATE SET 
  cost = EXCLUDED.cost,
  description = EXCLUDED.description,
  updated_at = now();

-- RLS for feature_costs (public read, admin write)
ALTER TABLE public.feature_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view feature costs"
  ON public.feature_costs
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage feature costs"
  ON public.feature_costs
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ================================================================
-- Ensure credit_transactions has idempotency enforcement
-- ================================================================

-- Add unique constraint for idempotency if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'credit_transactions_idempotency_unique'
  ) THEN
    ALTER TABLE public.credit_transactions 
      ADD CONSTRAINT credit_transactions_idempotency_unique 
      UNIQUE (user_id, idempotency_key);
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- ================================================================
-- Atomic credit debit RPC with idempotency
-- ================================================================

CREATE OR REPLACE FUNCTION public.rpc_debit_credits_for_job(
  p_user_id uuid,
  p_feature text,
  p_idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cost integer;
  v_wallet_sub integer;
  v_wallet_life integer;
  v_wallet_total integer;
  v_debit_sub integer := 0;
  v_debit_life integer := 0;
  v_existing_tx record;
BEGIN
  -- Get feature cost
  SELECT cost INTO v_cost FROM feature_costs WHERE feature = p_feature;
  IF v_cost IS NULL THEN
    v_cost := 1; -- Default cost
  END IF;
  
  -- Check for existing transaction (idempotency)
  SELECT * INTO v_existing_tx 
  FROM credit_transactions 
  WHERE user_id = p_user_id AND idempotency_key = p_idempotency_key;
  
  IF FOUND THEN
    -- Already debited, return success
    RETURN jsonb_build_object(
      'success', true,
      'already_debited', true,
      'cost', v_cost
    );
  END IF;
  
  -- Lock wallet row for update
  SELECT subscription_credits, lifetime_credits 
  INTO v_wallet_sub, v_wallet_life
  FROM user_wallets 
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'NO_WALLET',
      'message', 'Portefeuille introuvable'
    );
  END IF;
  
  v_wallet_total := COALESCE(v_wallet_sub, 0) + COALESCE(v_wallet_life, 0);
  
  IF v_wallet_total < v_cost THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INSUFFICIENT_CREDITS',
      'message', 'Crédits insuffisants',
      'current_balance', v_wallet_total,
      'required', v_cost
    );
  END IF;
  
  -- Debit subscription credits first, then lifetime
  IF v_wallet_sub >= v_cost THEN
    v_debit_sub := v_cost;
  ELSE
    v_debit_sub := COALESCE(v_wallet_sub, 0);
    v_debit_life := v_cost - v_debit_sub;
  END IF;
  
  -- Update wallet
  UPDATE user_wallets
  SET 
    subscription_credits = subscription_credits - v_debit_sub,
    lifetime_credits = lifetime_credits - v_debit_life
  WHERE user_id = p_user_id;
  
  -- Insert transaction record
  INSERT INTO credit_transactions (
    user_id, delta, credit_type, reason, feature, idempotency_key
  ) VALUES (
    p_user_id,
    -v_cost,
    CASE WHEN v_debit_life > 0 THEN 'mixed' ELSE 'subscription' END,
    'Job: ' || p_feature,
    p_feature,
    p_idempotency_key
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'cost', v_cost,
    'debited_subscription', v_debit_sub,
    'debited_lifetime', v_debit_life,
    'new_balance', v_wallet_total - v_cost
  );
END;
$$;

-- Refund credits function (for failed jobs)
CREATE OR REPLACE FUNCTION public.rpc_refund_credits_for_job(
  p_user_id uuid,
  p_feature text,
  p_original_idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cost integer;
  v_refund_key text;
  v_existing_refund record;
BEGIN
  -- Get feature cost
  SELECT cost INTO v_cost FROM feature_costs WHERE feature = p_feature;
  IF v_cost IS NULL THEN
    v_cost := 1;
  END IF;
  
  v_refund_key := p_original_idempotency_key || ':refund';
  
  -- Check for existing refund (idempotency)
  SELECT * INTO v_existing_refund 
  FROM credit_transactions 
  WHERE user_id = p_user_id AND idempotency_key = v_refund_key;
  
  IF FOUND THEN
    RETURN jsonb_build_object('success', true, 'already_refunded', true);
  END IF;
  
  -- Credit back to lifetime (safer)
  UPDATE user_wallets
  SET lifetime_credits = lifetime_credits + v_cost
  WHERE user_id = p_user_id;
  
  -- Insert refund transaction
  INSERT INTO credit_transactions (
    user_id, delta, credit_type, reason, feature, idempotency_key
  ) VALUES (
    p_user_id,
    v_cost,
    'lifetime',
    'Refund: ' || p_feature,
    p_feature,
    v_refund_key
  );
  
  RETURN jsonb_build_object('success', true, 'refunded', v_cost);
END;
$$;