-- Part 10: Add missing columns and functions for referral tracking

-- Add referral_code column to existing referral_events table
ALTER TABLE public.referral_events ADD COLUMN IF NOT EXISTS referral_code text NULL;
ALTER TABLE public.referral_events ADD COLUMN IF NOT EXISTS visitor_id text NULL;
ALTER TABLE public.referral_events ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Add visitor_id and landing_path to referral_clicks
ALTER TABLE public.referral_clicks ADD COLUMN IF NOT EXISTS visitor_id text NULL;
ALTER TABLE public.referral_clicks ADD COLUMN IF NOT EXISTS landing_path text NULL;

-- Indexes for referral_events (only create if not exists)
CREATE INDEX IF NOT EXISTS idx_referral_events_referrer ON public.referral_events(referrer_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referral_events_type ON public.referral_events(event_type, created_at DESC);

-- RPC: Get referral stats for a user (safe summary, no PII exposure)
CREATE OR REPLACE FUNCTION public.rpc_get_referral_stats(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral_code text;
  v_click_count int;
  v_signup_count int;
  v_qualified_count int;
  v_reward_count int;
  v_total_rewards_credits int;
BEGIN
  -- Get user's referral code
  SELECT code INTO v_referral_code
  FROM referral_codes
  WHERE user_id = p_user_id
  LIMIT 1;
  
  IF v_referral_code IS NULL THEN
    RETURN jsonb_build_object(
      'has_code', false,
      'referral_code', null,
      'clicks', 0,
      'signups', 0,
      'qualified', 0,
      'rewards', 0,
      'total_credits_earned', 0
    );
  END IF;
  
  -- Count clicks from referral_clicks
  SELECT COUNT(*) INTO v_click_count
  FROM referral_clicks
  WHERE referral_code = v_referral_code;
  
  -- Count events by type from referral_events
  SELECT 
    COALESCE(SUM(CASE WHEN event_type = 'signup' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN event_type = 'qualified' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN event_type = 'reward_granted' THEN 1 ELSE 0 END), 0)
  INTO v_signup_count, v_qualified_count, v_reward_count
  FROM referral_events
  WHERE referrer_user_id = p_user_id;
  
  -- Count from attributions as fallback for signups
  SELECT GREATEST(v_signup_count, COUNT(*)) INTO v_signup_count
  FROM referral_attributions
  WHERE referrer_user_id = p_user_id;
  
  -- Calculate total credits earned from referrals
  SELECT COALESCE(SUM(delta), 0) INTO v_total_rewards_credits
  FROM credit_transactions
  WHERE user_id = p_user_id
    AND reason LIKE 'referral_%';
  
  RETURN jsonb_build_object(
    'has_code', true,
    'referral_code', v_referral_code,
    'clicks', v_click_count,
    'signups', v_signup_count,
    'qualified', v_qualified_count,
    'rewards', v_reward_count,
    'total_credits_earned', v_total_rewards_credits
  );
END;
$$;

-- RPC: Admin referral funnel stats
CREATE OR REPLACE FUNCTION public.rpc_admin_referral_funnel(
  p_date_from date DEFAULT (now() - interval '30 days')::date,
  p_date_to date DEFAULT now()::date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clicks int;
  v_signups int;
  v_qualified int;
  v_rewards int;
BEGIN
  -- Check admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  
  -- Count clicks
  SELECT COUNT(*) INTO v_clicks
  FROM referral_clicks
  WHERE created_at::date BETWEEN p_date_from AND p_date_to;
  
  -- Count signups from attributions
  SELECT COUNT(*) INTO v_signups
  FROM referral_attributions
  WHERE created_at::date BETWEEN p_date_from AND p_date_to;
  
  -- Count qualified and rewards from events
  SELECT 
    COALESCE(SUM(CASE WHEN event_type = 'qualified' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN event_type = 'reward_granted' THEN 1 ELSE 0 END), 0)
  INTO v_qualified, v_rewards
  FROM referral_events
  WHERE created_at::date BETWEEN p_date_from AND p_date_to;
  
  RETURN jsonb_build_object(
    'total_clicks', v_clicks,
    'total_signups', v_signups,
    'total_qualified', v_qualified,
    'total_rewards', v_rewards,
    'conversion_click_to_signup', CASE WHEN v_clicks > 0 THEN ROUND((v_signups::numeric / v_clicks::numeric) * 100, 2) ELSE 0 END,
    'conversion_signup_to_qualified', CASE WHEN v_signups > 0 THEN ROUND((v_qualified::numeric / v_signups::numeric) * 100, 2) ELSE 0 END
  );
END;
$$;

-- RPC: Admin conversion funnel
CREATE OR REPLACE FUNCTION public.rpc_admin_conversion_funnel(
  p_date_from date DEFAULT (now() - interval '30 days')::date,
  p_date_to date DEFAULT now()::date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_signups int;
  v_onboarding_completed int;
  v_first_menu int;
  v_first_purchase int;
BEGIN
  -- Check admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  
  -- Signups in period
  SELECT COUNT(*) INTO v_signups
  FROM profiles
  WHERE created_at::date BETWEEN p_date_from AND p_date_to;
  
  -- Onboarding completed
  SELECT COUNT(*) INTO v_onboarding_completed
  FROM user_profiles
  WHERE onboarding_status = 'completed';
  
  -- First menu generated
  SELECT COUNT(DISTINCT user_id) INTO v_first_menu
  FROM weekly_menus
  WHERE created_at::date BETWEEN p_date_from AND p_date_to;
  
  -- First credit purchase
  SELECT COUNT(DISTINCT user_id) INTO v_first_purchase
  FROM credit_transactions
  WHERE reason = 'purchase'
    AND created_at::date BETWEEN p_date_from AND p_date_to;
  
  RETURN jsonb_build_object(
    'signups', v_signups,
    'onboarding_completed', v_onboarding_completed,
    'first_menu_generated', v_first_menu,
    'first_credit_purchase', v_first_purchase,
    'conversion_signup_to_onboarding', CASE WHEN v_signups > 0 THEN ROUND((v_onboarding_completed::numeric / v_signups::numeric) * 100, 2) ELSE 0 END,
    'conversion_onboarding_to_menu', CASE WHEN v_onboarding_completed > 0 THEN ROUND((v_first_menu::numeric / v_onboarding_completed::numeric) * 100, 2) ELSE 0 END
  );
END;
$$;

-- RPC: Record referral event idempotently
CREATE OR REPLACE FUNCTION public.rpc_record_referral_event(
  p_referrer_user_id uuid,
  p_event_type text,
  p_referred_user_id uuid DEFAULT NULL,
  p_referral_code text DEFAULT NULL,
  p_visitor_id text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_idempotency_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_id uuid;
  v_new_id uuid;
BEGIN
  -- Check idempotency if key provided
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_existing_id
    FROM referral_events
    WHERE referrer_user_id = p_referrer_user_id
      AND event_type = p_event_type
      AND idempotency_key = p_idempotency_key
    LIMIT 1;
    
    IF v_existing_id IS NOT NULL THEN
      RETURN jsonb_build_object('success', true, 'event_id', v_existing_id, 'already_exists', true);
    END IF;
  END IF;
  
  -- Insert new event
  INSERT INTO referral_events (
    referrer_user_id,
    referred_user_id,
    event_type,
    referral_code,
    visitor_id,
    metadata,
    idempotency_key
  ) VALUES (
    p_referrer_user_id,
    p_referred_user_id,
    p_event_type,
    p_referral_code,
    p_visitor_id,
    p_metadata,
    p_idempotency_key
  )
  RETURNING id INTO v_new_id;
  
  RETURN jsonb_build_object('success', true, 'event_id', v_new_id, 'already_exists', false);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.rpc_get_referral_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_referral_funnel(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_admin_conversion_funnel(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_record_referral_event(uuid, text, uuid, text, text, jsonb, text) TO authenticated;