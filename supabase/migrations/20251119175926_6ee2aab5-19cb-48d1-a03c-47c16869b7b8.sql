-- Add free months tracking to user_wallets
ALTER TABLE public.user_wallets 
ADD COLUMN IF NOT EXISTS free_months_earned integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS free_months_used integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.user_wallets.free_months_earned IS 'Total free months earned from referrals (5 referrals = 1 month)';
COMMENT ON COLUMN public.user_wallets.free_months_used IS 'Number of free months already applied to billing';

-- Update handle_referral_signup to check for 5 referrals milestone
CREATE OR REPLACE FUNCTION public.handle_referral_signup(p_referral_code text, p_new_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_referrer_id uuid;
  v_referral_exists boolean;
  v_credits_to_award integer := 10;
  v_subscribed_count integer;
  v_unrewarded_count integer;
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
  
  -- Create referral record with SIGNED_UP status
  INSERT INTO public.user_referrals (
    referrer_id,
    referred_user_id,
    status
  ) VALUES (
    v_referrer_id,
    p_new_user_id,
    'SIGNED_UP'
  );
  
  -- Award initial credits for signup
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
      'referral_code', p_referral_code,
      'stage', 'signup'
    )
  );
  
  -- Initialize wallet if needed
  INSERT INTO public.user_wallets (user_id)
  VALUES (v_referrer_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Award signup credits
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
    'credits_awarded', v_credits_to_award,
    'stage', 'signup'
  );
END;
$function$;

-- Function to handle when referred user subscribes (called from webhook)
CREATE OR REPLACE FUNCTION public.handle_referred_user_subscribed(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_referrer_id uuid;
  v_subscribed_count integer;
  v_unrewarded_count integer;
  v_free_months_to_award integer;
  v_bonus_credits integer := 20;
BEGIN
  -- Find the referrer for this user
  SELECT referrer_id INTO v_referrer_id
  FROM public.user_referrals
  WHERE referred_user_id = p_user_id
    AND status = 'SIGNED_UP'
  LIMIT 1;
  
  IF v_referrer_id IS NULL THEN
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
    -- Mark 5 referrals as rewarded per free month
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
    
    -- Award free months
    UPDATE public.user_wallets
    SET 
      free_months_earned = free_months_earned + v_free_months_to_award,
      updated_at = now()
    WHERE user_id = v_referrer_id;
    
    -- Award bonus credits
    UPDATE public.user_wallets
    SET 
      credits_total = credits_total + v_bonus_credits,
      lifetime_credits_earned = lifetime_credits_earned + v_bonus_credits,
      updated_at = now()
    WHERE user_id = v_referrer_id;
    
    INSERT INTO public.user_credit_lots (user_id, credits, expires_at)
    VALUES (v_referrer_id, v_bonus_credits, now() + interval '1 year');
    
    -- Log event
    INSERT INTO public.user_events (
      user_id,
      event_type,
      points_delta,
      credits_delta,
      meta
    ) VALUES (
      v_referrer_id,
      'REFERRAL_MILESTONE',
      50,
      v_bonus_credits,
      jsonb_build_object(
        'free_months_earned', v_free_months_to_award,
        'total_subscribed', v_subscribed_count,
        'milestone', '5_referrals'
      )
    );
    
    -- Update points
    UPDATE public.user_wallets
    SET 
      points_total = points_total + 50,
      lifetime_points = lifetime_points + 50,
      updated_at = now()
    WHERE user_id = v_referrer_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'referrer_id', v_referrer_id,
    'subscribed_count', v_subscribed_count,
    'free_months_awarded', v_free_months_to_award,
    'bonus_credits', CASE WHEN v_free_months_to_award > 0 THEN v_bonus_credits ELSE 0 END
  );
END;
$function$;