-- ============================================================
-- REFERRAL & AFFILIATE RELIABILITY HARDENING
-- Fixes: self-referral, idempotency, lifecycle events, 
--        parameter mismatches, audit trail
-- ============================================================

-- 1. Add status/error columns to referral_events for lifecycle tracking
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='referral_events' AND column_name='status') THEN
    ALTER TABLE public.referral_events ADD COLUMN status text DEFAULT 'success';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='referral_events' AND column_name='error_message') THEN
    ALTER TABLE public.referral_events ADD COLUMN error_message text;
  END IF;
END $$;

-- 2. Add idempotency constraint on referral_events
CREATE UNIQUE INDEX IF NOT EXISTS referral_events_idempotency_key_unique 
  ON public.referral_events(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- 3. Create affiliate_events table for audit trail
CREATE TABLE IF NOT EXISTS public.affiliate_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_code text,
  affiliate_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  referred_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  status text NOT NULL DEFAULT 'success',
  reference_type text,
  reference_id text,
  idempotency_key text,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS affiliate_events_idempotency_key_unique
  ON public.affiliate_events(idempotency_key) WHERE idempotency_key IS NOT NULL;

ALTER TABLE public.affiliate_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on affiliate_events"
  ON public.affiliate_events FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Users can read own affiliate events"
  ON public.affiliate_events FOR SELECT TO authenticated
  USING (affiliate_user_id = auth.uid() OR referred_user_id = auth.uid());

-- 4. Fix handle_referral_signup: use referral_codes table, add self-referral check, add event logging
CREATE OR REPLACE FUNCTION public.handle_referral_signup(
  p_referral_code text,
  p_new_user_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id uuid;
  v_referral_exists boolean;
  v_idempotency_key text;
BEGIN
  v_idempotency_key := 'ref_signup:' || p_new_user_id::text;

  -- Look up referrer from referral_codes table (actual source of truth)
  SELECT user_id INTO v_referrer_id
  FROM public.referral_codes
  WHERE code = p_referral_code;

  -- Fallback: check user_profiles.referral_code for backwards compat
  IF v_referrer_id IS NULL THEN
    SELECT id INTO v_referrer_id
    FROM public.user_profiles
    WHERE referral_code = p_referral_code;
  END IF;

  IF v_referrer_id IS NULL THEN
    INSERT INTO public.referral_events (referrer_user_id, referred_user_id, event_type, referral_code, status, error_message, idempotency_key)
    VALUES (null, p_new_user_id, 'signup_failed', p_referral_code, 'failed', 'Invalid referral code', v_idempotency_key || ':invalid')
    ON CONFLICT DO NOTHING;
    RETURN jsonb_build_object('success', false, 'message', 'Code de parrainage invalide');
  END IF;

  -- SELF-REFERRAL CHECK
  IF v_referrer_id = p_new_user_id THEN
    INSERT INTO public.referral_events (referrer_user_id, referred_user_id, event_type, referral_code, status, error_message, idempotency_key)
    VALUES (v_referrer_id, p_new_user_id, 'signup_rejected', p_referral_code, 'rejected', 'Self-referral blocked', v_idempotency_key || ':self')
    ON CONFLICT DO NOTHING;
    RETURN jsonb_build_object('success', false, 'message', 'Auto-parrainage non autorisé');
  END IF;

  -- Check if already attributed
  SELECT EXISTS(
    SELECT 1 FROM public.user_referrals WHERE referred_user_id = p_new_user_id
  ) INTO v_referral_exists;

  IF v_referral_exists THEN
    RETURN jsonb_build_object('success', false, 'already_attributed', true, 'message', 'Parrainage déjà enregistré');
  END IF;

  -- Insert referral
  INSERT INTO public.user_referrals (referrer_id, referred_user_id, status)
  VALUES (v_referrer_id, p_new_user_id, 'SIGNED_UP')
  ON CONFLICT (referred_user_id) DO NOTHING;

  -- Insert into referral_attributions for audit
  INSERT INTO public.referral_attributions (referrer_user_id, referred_user_id, source)
  VALUES (v_referrer_id, p_new_user_id, 'referral_code')
  ON CONFLICT (referred_user_id) DO NOTHING;

  -- Award welcome credits to referrer
  INSERT INTO public.user_events (user_id, event_type, points_delta, credits_delta, meta)
  VALUES (
    v_referrer_id, 'REFERRAL_COMPLETED', 0, 10,
    jsonb_build_object('referred_user_id', p_new_user_id, 'referral_code', p_referral_code)
  );

  -- Log successful event
  INSERT INTO public.referral_events (referrer_user_id, referred_user_id, event_type, referral_code, status, idempotency_key, metadata)
  VALUES (v_referrer_id, p_new_user_id, 'signup', p_referral_code, 'success', v_idempotency_key,
    jsonb_build_object('credits_awarded', 10))
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object('success', true, 'message', 'Parrainage enregistré avec succès', 'referrer_id', v_referrer_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.handle_referral_signup TO authenticated, service_role;

-- 5. Fix handle_referred_user_subscribed: add idempotency + accept optional referral_code
DROP FUNCTION IF EXISTS public.handle_referred_user_subscribed(uuid);
DROP FUNCTION IF EXISTS public.handle_referred_user_subscribed(uuid, text);

CREATE OR REPLACE FUNCTION public.handle_referred_user_subscribed(
  p_user_id uuid,
  p_referral_code text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id uuid;
  v_subscribed_count integer;
  v_unrewarded_count integer;
  v_free_months_to_award integer;
  v_bonus_credits integer := 20;
  v_idempotency_key text;
  v_already_processed boolean;
BEGIN
  v_idempotency_key := 'ref_subscribed:' || p_user_id::text;

  -- Idempotency: check if already processed
  SELECT EXISTS(
    SELECT 1 FROM public.referral_events 
    WHERE idempotency_key = v_idempotency_key AND status = 'success'
  ) INTO v_already_processed;

  IF v_already_processed THEN
    RETURN jsonb_build_object('success', true, 'idempotent_hit', true, 'message', 'Already processed');
  END IF;

  -- Find the referrer for this user
  SELECT referrer_id INTO v_referrer_id
  FROM public.user_referrals
  WHERE referred_user_id = p_user_id
    AND status = 'SIGNED_UP'
  LIMIT 1;
  
  IF v_referrer_id IS NULL THEN
    INSERT INTO public.referral_events (referrer_user_id, referred_user_id, event_type, referral_code, status, error_message, idempotency_key)
    VALUES (null, p_user_id, 'subscription_no_referrer', p_referral_code, 'skipped', 'No pending referral found', v_idempotency_key || ':none')
    ON CONFLICT DO NOTHING;
    RETURN jsonb_build_object('success', false, 'message', 'No pending referral found');
  END IF;
  
  -- Update referral status to SUBSCRIBED
  UPDATE public.user_referrals
  SET status = 'SUBSCRIBED', updated_at = now()
  WHERE referred_user_id = p_user_id AND referrer_id = v_referrer_id;
  
  -- Count total subscribed referrals
  SELECT COUNT(*) INTO v_subscribed_count
  FROM public.user_referrals
  WHERE referrer_id = v_referrer_id AND status = 'SUBSCRIBED';
  
  -- Count unrewarded subscribed referrals
  SELECT COUNT(*) INTO v_unrewarded_count
  FROM public.user_referrals
  WHERE referrer_id = v_referrer_id 
    AND status = 'SUBSCRIBED'
    AND (rewarded IS NULL OR rewarded = false);
  
  -- Calculate free months to award (every 5 unrewarded = 1 month)
  v_free_months_to_award := v_unrewarded_count / 5;
  
  IF v_free_months_to_award > 0 THEN
    UPDATE public.user_referrals
    SET rewarded = true, updated_at = now()
    WHERE id IN (
      SELECT id FROM public.user_referrals
      WHERE referrer_id = v_referrer_id 
        AND status = 'SUBSCRIBED'
        AND (rewarded IS NULL OR rewarded = false)
      ORDER BY created_at ASC
      LIMIT (v_free_months_to_award * 5)
    );
    
    UPDATE public.user_wallets
    SET free_months_earned = free_months_earned + v_free_months_to_award, updated_at = now()
    WHERE user_id = v_referrer_id;
    
    UPDATE public.user_wallets
    SET credits_total = credits_total + v_bonus_credits, lifetime_credits_earned = lifetime_credits_earned + v_bonus_credits, updated_at = now()
    WHERE user_id = v_referrer_id;
    
    INSERT INTO public.user_credit_lots (user_id, credits, expires_at)
    VALUES (v_referrer_id, v_bonus_credits, now() + interval '1 year');
    
    INSERT INTO public.user_events (user_id, event_type, points_delta, credits_delta, meta)
    VALUES (v_referrer_id, 'REFERRAL_MILESTONE', 50, v_bonus_credits,
      jsonb_build_object('free_months_earned', v_free_months_to_award, 'total_subscribed', v_subscribed_count, 'milestone', '5_referrals'));
    
    UPDATE public.user_wallets
    SET points_total = points_total + 50, lifetime_points = lifetime_points + 50, updated_at = now()
    WHERE user_id = v_referrer_id;
  END IF;

  -- Log successful event
  INSERT INTO public.referral_events (referrer_user_id, referred_user_id, event_type, referral_code, status, idempotency_key, metadata)
  VALUES (v_referrer_id, p_user_id, 'qualified', p_referral_code, 'success', v_idempotency_key,
    jsonb_build_object('subscribed_count', v_subscribed_count, 'free_months_awarded', v_free_months_to_award, 'bonus_credits', CASE WHEN v_free_months_to_award > 0 THEN v_bonus_credits ELSE 0 END))
  ON CONFLICT DO NOTHING;
  
  RETURN jsonb_build_object(
    'success', true,
    'referrer_id', v_referrer_id,
    'subscribed_count', v_subscribed_count,
    'free_months_awarded', v_free_months_to_award,
    'bonus_credits', CASE WHEN v_free_months_to_award > 0 THEN v_bonus_credits ELSE 0 END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.handle_referred_user_subscribed TO service_role;

-- 6. Create repair function for referral/affiliate attribution
CREATE OR REPLACE FUNCTION public.repair_referral_attribution(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb := '{}'::jsonb;
  v_referrer_id uuid;
  v_has_attribution boolean;
  v_has_user_referral boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM referral_attributions WHERE referred_user_id = p_user_id) INTO v_has_attribution;
  SELECT EXISTS(SELECT 1 FROM user_referrals WHERE referred_user_id = p_user_id) INTO v_has_user_referral;

  IF v_has_attribution AND NOT v_has_user_referral THEN
    SELECT referrer_user_id INTO v_referrer_id FROM referral_attributions WHERE referred_user_id = p_user_id;
    IF v_referrer_id IS NOT NULL THEN
      INSERT INTO user_referrals (referrer_id, referred_user_id, status)
      VALUES (v_referrer_id, p_user_id, 'SIGNED_UP')
      ON CONFLICT (referred_user_id) DO NOTHING;
      v_result := v_result || jsonb_build_object('user_referral_repaired', true);
    END IF;
  END IF;

  IF v_has_user_referral AND NOT v_has_attribution THEN
    SELECT referrer_id INTO v_referrer_id FROM user_referrals WHERE referred_user_id = p_user_id LIMIT 1;
    IF v_referrer_id IS NOT NULL THEN
      INSERT INTO referral_attributions (referrer_user_id, referred_user_id, source)
      VALUES (v_referrer_id, p_user_id, 'repair')
      ON CONFLICT (referred_user_id) DO NOTHING;
      v_result := v_result || jsonb_build_object('attribution_repaired', true);
    END IF;
  END IF;

  v_result := v_result || jsonb_build_object('user_id', p_user_id, 'has_attribution', v_has_attribution OR v_has_user_referral);
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.repair_referral_attribution TO service_role;

-- 7. Ensure RLS on referral_events
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'referral_events' AND policyname = 'Users can read own referral events') THEN
    CREATE POLICY "Users can read own referral events"
      ON public.referral_events FOR SELECT TO authenticated
      USING (referrer_user_id = auth.uid() OR referred_user_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'referral_events' AND policyname = 'Service role full access on referral_events') THEN
    CREATE POLICY "Service role full access on referral_events"
      ON public.referral_events FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;