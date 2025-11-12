-- Fix referral credits attribution
-- The handle_referral_signup function was inserting into user_events
-- but not updating user_wallets, so credits were never actually awarded

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
  v_referral_exists boolean;
  v_result jsonb;
  v_credits_to_award integer := 10;
BEGIN
  -- Find referrer by code
  SELECT id INTO v_referrer_id
  FROM public.user_profiles
  WHERE referral_code = p_referral_code;
  
  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Code de parrainage invalide'
    );
  END IF;
  
  -- Prevent self-referral
  IF v_referrer_id = p_new_user_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Vous ne pouvez pas utiliser votre propre code'
    );
  END IF;
  
  -- Check if user already signed up with a referral
  SELECT EXISTS(
    SELECT 1 FROM public.user_referrals
    WHERE referred_user_id = p_new_user_id
  ) INTO v_referral_exists;
  
  IF v_referral_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Vous avez déjà utilisé un code de parrainage'
    );
  END IF;
  
  -- Create referral record
  INSERT INTO public.user_referrals (
    referrer_id,
    referred_user_id,
    status
  ) VALUES (
    v_referrer_id,
    p_new_user_id,
    'SIGNED_UP'
  );
  
  -- Log the event
  INSERT INTO public.user_events (
    user_id,
    event_type,
    points_delta,
    credits_delta,
    meta
  ) VALUES (
    v_referrer_id,
    'REFERRAL_COMPLETED',
    0,
    v_credits_to_award,
    jsonb_build_object(
      'referred_user_id', p_new_user_id,
      'referral_code', p_referral_code
    )
  );
  
  -- Initialize wallet if needed
  INSERT INTO public.user_wallets (user_id)
  VALUES (v_referrer_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Award credits to referrer's wallet
  UPDATE public.user_wallets
  SET 
    credits_total = credits_total + v_credits_to_award,
    lifetime_credits_earned = lifetime_credits_earned + v_credits_to_award,
    updated_at = now()
  WHERE user_id = v_referrer_id;
  
  -- Add credits to credit lots
  INSERT INTO public.user_credit_lots (
    user_id,
    credits,
    consumed,
    expires_at
  ) VALUES (
    v_referrer_id,
    v_credits_to_award,
    0,
    now() + interval '1 year'
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Parrainage enregistré ! ' || v_credits_to_award || ' crédits ajoutés',
    'referrer_id', v_referrer_id,
    'credits_awarded', v_credits_to_award
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.handle_referral_signup TO authenticated, service_role;