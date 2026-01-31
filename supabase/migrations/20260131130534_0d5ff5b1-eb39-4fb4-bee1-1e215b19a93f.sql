-- Fix search_path for all functions that don't have it set

-- Fix generate_user_referral_code
DROP FUNCTION IF EXISTS public.generate_user_referral_code(uuid);
CREATE OR REPLACE FUNCTION public.generate_user_referral_code(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_attempts int := 0;
BEGIN
  -- Check if user already has a code
  SELECT code INTO v_code FROM public.referral_codes WHERE user_id = p_user_id;
  IF v_code IS NOT NULL THEN
    RETURN v_code;
  END IF;
  
  -- Generate unique code
  LOOP
    v_code := upper(substr(md5(random()::text || p_user_id::text), 1, 8));
    
    BEGIN
      INSERT INTO public.referral_codes (user_id, code)
      VALUES (p_user_id, v_code);
      RETURN v_code;
    EXCEPTION WHEN unique_violation THEN
      v_attempts := v_attempts + 1;
      IF v_attempts > 10 THEN
        RAISE EXCEPTION 'Could not generate unique referral code';
      END IF;
    END;
  END LOOP;
END;
$$;

-- Fix handle_referral_signup
DROP FUNCTION IF EXISTS public.handle_referral_signup(text, uuid);
CREATE OR REPLACE FUNCTION public.handle_referral_signup(
  p_referral_code text,
  p_new_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id uuid;
  v_idempotency_key text;
  v_existing_attribution uuid;
BEGIN
  -- Validate input
  IF p_referral_code IS NULL OR p_referral_code = '' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Code de parrainage requis');
  END IF;

  -- Find referrer
  SELECT user_id INTO v_referrer_id
  FROM public.referral_codes
  WHERE code = upper(p_referral_code);
  
  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Code de parrainage invalide');
  END IF;
  
  -- Cannot refer yourself
  IF v_referrer_id = p_new_user_id THEN
    RETURN jsonb_build_object('success', false, 'message', 'Vous ne pouvez pas vous parrainer vous-même');
  END IF;
  
  -- Check if already attributed
  SELECT id INTO v_existing_attribution
  FROM public.referral_attributions
  WHERE referred_user_id = p_new_user_id;
  
  IF v_existing_attribution IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'message', 'Parrainage déjà enregistré', 'already_attributed', true);
  END IF;
  
  -- Create attribution
  INSERT INTO public.referral_attributions (referrer_user_id, referred_user_id, source)
  VALUES (v_referrer_id, p_new_user_id, 'ref_code');
  
  -- Create signup event (idempotent)
  v_idempotency_key := 'ref_signup:' || p_new_user_id::text;
  
  INSERT INTO public.referral_events (referrer_user_id, referred_user_id, event_type, idempotency_key)
  VALUES (v_referrer_id, p_new_user_id, 'signup', v_idempotency_key)
  ON CONFLICT (idempotency_key) DO NOTHING;
  
  RETURN jsonb_build_object('success', true, 'message', 'Parrainage enregistré avec succès', 'referrer_id', v_referrer_id);
END;
$$;

-- Fix handle_referral_qualification
DROP FUNCTION IF EXISTS public.handle_referral_qualification(uuid, text, text);
CREATE OR REPLACE FUNCTION public.handle_referral_qualification(
  p_referred_user_id uuid,
  p_reference_type text DEFAULT NULL,
  p_reference_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attribution record;
  v_qualified_key text;
  v_reward_key text;
  v_reward_credits int := 10; -- Reward amount for referrer
BEGIN
  -- Find attribution
  SELECT * INTO v_attribution
  FROM public.referral_attributions
  WHERE referred_user_id = p_referred_user_id;
  
  IF v_attribution IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'No attribution found');
  END IF;
  
  -- Check if already qualified
  v_qualified_key := 'ref_qualified:' || p_referred_user_id::text;
  
  IF EXISTS (SELECT 1 FROM public.referral_events WHERE idempotency_key = v_qualified_key) THEN
    RETURN jsonb_build_object('success', true, 'message', 'Already qualified', 'already_qualified', true);
  END IF;
  
  -- Create qualified event
  INSERT INTO public.referral_events (referrer_user_id, referred_user_id, event_type, reference_type, reference_id, idempotency_key)
  VALUES (v_attribution.referrer_user_id, p_referred_user_id, 'qualified', p_reference_type, p_reference_id, v_qualified_key);
  
  -- Grant reward to referrer (idempotent)
  v_reward_key := 'ref_reward:' || p_referred_user_id::text;
  
  IF NOT EXISTS (SELECT 1 FROM public.referral_events WHERE idempotency_key = v_reward_key) THEN
    -- Add credits to referrer wallet
    UPDATE public.user_wallets
    SET lifetime_credits = lifetime_credits + v_reward_credits
    WHERE user_id = v_attribution.referrer_user_id;
    
    -- If no wallet, create one
    IF NOT FOUND THEN
      INSERT INTO public.user_wallets (user_id, subscription_credits, lifetime_credits)
      VALUES (v_attribution.referrer_user_id, 0, v_reward_credits);
    END IF;
    
    -- Record credit transaction
    INSERT INTO public.credit_transactions (user_id, delta, credit_type, reason, reference_type, reference_id, idempotency_key)
    VALUES (v_attribution.referrer_user_id, v_reward_credits, 'lifetime', 'referral_reward', 'referral', p_referred_user_id::text, 'credit_' || v_reward_key);
    
    -- Create reward_granted event
    INSERT INTO public.referral_events (referrer_user_id, referred_user_id, event_type, reference_type, reference_id, idempotency_key)
    VALUES (v_attribution.referrer_user_id, p_referred_user_id, 'reward_granted', 'credits', v_reward_credits::text, v_reward_key);
  END IF;
  
  RETURN jsonb_build_object('success', true, 'message', 'Referral qualified and reward granted', 'reward_credits', v_reward_credits);
END;
$$;