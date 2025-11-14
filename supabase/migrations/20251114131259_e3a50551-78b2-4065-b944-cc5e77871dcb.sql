-- Zen Credits System Setup
-- This migration ensures the credits infrastructure is properly configured

-- 1. Ensure user_wallets has proper constraints
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_wallets_credits_positive'
  ) THEN
    ALTER TABLE public.user_wallets 
    ADD CONSTRAINT user_wallets_credits_positive CHECK (credits_total >= 0);
  END IF;
END $$;

-- 2. Create index on user_events for credit transactions
CREATE INDEX IF NOT EXISTS idx_user_events_credits 
ON public.user_events (user_id, event_type) 
WHERE credits_delta != 0;

-- 3. Create helper function to check and consume credits atomically
CREATE OR REPLACE FUNCTION public.check_and_consume_credits(
  p_user_id uuid,
  p_feature text,
  p_cost integer DEFAULT 1
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_credits integer;
  v_new_balance integer;
BEGIN
  -- Lock the wallet row for update
  SELECT credits_total INTO v_current_credits
  FROM public.user_wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- If no wallet exists, create one with 0 credits
  IF NOT FOUND THEN
    INSERT INTO public.user_wallets (user_id, credits_total, points_total)
    VALUES (p_user_id, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;
    v_current_credits := 0;
  END IF;

  -- Check if user has enough credits
  IF v_current_credits < p_cost THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INSUFFICIENT_CREDITS',
      'message', 'Pas assez de crédits. Va sur la page d''achat pour obtenir des Crédits Zen.',
      'current_balance', v_current_credits,
      'required', p_cost
    );
  END IF;

  -- Consume credits using existing function
  PERFORM public.fn_consume_credit(p_cost);

  -- Log the usage in user_events with feature details
  INSERT INTO public.user_events (user_id, event_type, meta, credits_delta)
  VALUES (
    p_user_id,
    'CREDITS_SPENT',
    jsonb_build_object('feature', p_feature, 'cost', p_cost),
    -p_cost
  );

  -- Get new balance
  SELECT credits_total INTO v_new_balance
  FROM public.user_wallets
  WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'previous_balance', v_current_credits,
    'new_balance', v_new_balance,
    'consumed', p_cost
  );
END;
$$;

-- 4. Create function to add credits (for Stripe webhook)
CREATE OR REPLACE FUNCTION public.add_credits_from_purchase(
  p_user_id uuid,
  p_credits integer,
  p_stripe_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance integer;
BEGIN
  -- Initialize wallet if needed
  INSERT INTO public.user_wallets (user_id, credits_total, points_total)
  VALUES (p_user_id, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- Add credits to wallet
  UPDATE public.user_wallets
  SET 
    credits_total = credits_total + p_credits,
    lifetime_credits_earned = lifetime_credits_earned + p_credits,
    updated_at = now()
  WHERE user_id = p_user_id
  RETURNING credits_total INTO v_new_balance;

  -- Add to credit lots (with 1 year expiry)
  INSERT INTO public.user_credit_lots (user_id, credits, expires_at)
  VALUES (p_user_id, p_credits, now() + interval '1 year');

  -- Log the purchase event
  INSERT INTO public.user_events (user_id, event_type, meta, credits_delta)
  VALUES (
    p_user_id,
    'CREDITS_PURCHASED',
    jsonb_build_object(
      'credits', p_credits,
      'stripe_metadata', p_stripe_metadata
    ),
    p_credits
  );

  RETURN jsonb_build_object(
    'success', true,
    'new_balance', v_new_balance,
    'credits_added', p_credits
  );
END;
$$;

-- 5. Add RLS policies for the new functions
COMMENT ON FUNCTION public.check_and_consume_credits IS 'Atomically checks and consumes credits for a feature';
COMMENT ON FUNCTION public.add_credits_from_purchase IS 'Adds credits from Stripe purchase (service role only)';
