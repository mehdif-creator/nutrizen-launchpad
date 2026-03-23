
-- ============================================================
-- SECURITY HARDENING: Revoke public EXECUTE on privileged RPCs
-- and add ownership enforcement inside functions
-- ============================================================

-- 1. REVOKE all public/anon/authenticated access on financial RPCs
REVOKE ALL ON FUNCTION public.handle_referral_signup(text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_referred_user_subscribed(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.repair_referral_attribution(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.repair_affiliate_attribution(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.check_and_consume_credits(uuid, text, integer) FROM PUBLIC, anon, authenticated;

-- 2. Grant EXECUTE only to service_role for all privileged functions
GRANT EXECUTE ON FUNCTION public.handle_referral_signup(text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_referred_user_subscribed(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.check_and_consume_credits(uuid, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.repair_referral_attribution(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.repair_affiliate_attribution(uuid) TO service_role;

-- 3. Rewrite repair_referral_attribution with admin-only guard
CREATE OR REPLACE FUNCTION public.repair_referral_attribution(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE 
  v_referrer_id uuid; 
  v_code text; 
  v_has_attribution boolean;
  v_caller_id uuid;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NOT NULL THEN
    IF NOT public.has_role(v_caller_id, 'admin') THEN
      RAISE EXCEPTION 'Access denied: admin role required'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  SELECT referrer_id, referral_code INTO v_referrer_id, v_code 
  FROM public.user_referrals WHERE referred_user_id = p_user_id LIMIT 1;
  
  IF v_referrer_id IS NULL THEN 
    RETURN jsonb_build_object('repaired', false, 'reason', 'No referral found'); 
  END IF;
  
  SELECT EXISTS(SELECT 1 FROM public.referral_attributions WHERE referred_user_id = p_user_id) 
  INTO v_has_attribution;
  
  IF NOT v_has_attribution THEN
    INSERT INTO public.referral_attributions (referrer_user_id, referred_user_id, source) 
    VALUES (v_referrer_id, p_user_id, 'repair') ON CONFLICT (referred_user_id) DO NOTHING;
  END IF;
  
  INSERT INTO public.referral_events (referrer_user_id, referred_user_id, event_type, referral_code, status, metadata)
  VALUES (v_referrer_id, p_user_id, 'repair', v_code, 'success', 
    jsonb_build_object('had_attribution', v_has_attribution, 'repaired_by', COALESCE(v_caller_id::text, 'service_role')));
  
  RETURN jsonb_build_object('repaired', true, 'referrer_id', v_referrer_id, 'code', v_code);
END;
$function$;

-- 4. Rewrite repair_affiliate_attribution with admin-only guard
CREATE OR REPLACE FUNCTION public.repair_affiliate_attribution(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE 
  v_aff_code text; 
  v_aff_user_id uuid; 
  v_has_commission boolean; 
  v_customer_id text;
  v_caller_id uuid;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NOT NULL THEN
    IF NOT public.has_role(v_caller_id, 'admin') THEN
      RAISE EXCEPTION 'Access denied: admin role required'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  SELECT affiliate_code INTO v_aff_code 
  FROM public.affiliate_referrals WHERE referred_user_id = p_user_id LIMIT 1;
  
  IF v_aff_code IS NULL THEN 
    RETURN jsonb_build_object('repaired', false, 'reason', 'No affiliate attribution found'); 
  END IF;
  
  SELECT user_id INTO v_aff_user_id 
  FROM public.affiliates WHERE affiliate_code = v_aff_code AND is_active = true;
  
  IF v_aff_user_id IS NULL THEN 
    RETURN jsonb_build_object('repaired', false, 'reason', 'Affiliate inactive'); 
  END IF;
  
  SELECT stripe_customer_id INTO v_customer_id FROM public.profiles WHERE id = p_user_id;
  IF v_customer_id IS NOT NULL THEN
    UPDATE public.affiliate_referrals 
    SET stripe_customer_id = v_customer_id 
    WHERE referred_user_id = p_user_id AND (stripe_customer_id IS NULL OR stripe_customer_id = '');
  END IF;
  
  SELECT EXISTS(SELECT 1 FROM public.affiliate_commissions WHERE referred_user_id = p_user_id) 
  INTO v_has_commission;
  
  IF v_has_commission THEN 
    UPDATE public.affiliate_referrals SET converted = true 
    WHERE referred_user_id = p_user_id AND converted = false; 
  END IF;
  
  INSERT INTO public.affiliate_events (affiliate_code, affiliate_user_id, referred_user_id, event_type, status, source, metadata)
  VALUES (v_aff_code, v_aff_user_id, p_user_id, 'repair', 'success', 'repair_rpc', 
    jsonb_build_object('has_commission', v_has_commission, 'customer_id', v_customer_id, 'repaired_by', COALESCE(v_caller_id::text, 'service_role')));
  
  RETURN jsonb_build_object('repaired', true, 'affiliate_code', v_aff_code, 'has_commission', v_has_commission);
END;
$function$;

-- 5. Rewrite check_and_consume_credits with ownership enforcement
CREATE OR REPLACE FUNCTION public.check_and_consume_credits(p_user_id uuid, p_feature text, p_cost integer DEFAULT 1)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_subscription_credits integer;
  v_lifetime_credits integer;
  v_total_available integer;
  v_subscription_used integer := 0;
  v_lifetime_used integer := 0;
  v_new_subscription integer;
  v_new_lifetime integer;
  v_caller_id uuid;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NOT NULL AND v_caller_id != p_user_id THEN
    RAISE EXCEPTION 'Access denied: cannot consume credits for another user'
      USING ERRCODE = '42501';
  END IF;

  SELECT subscription_credits, lifetime_credits
  INTO v_subscription_credits, v_lifetime_credits
  FROM public.user_wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

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

  IF v_subscription_credits >= p_cost THEN
    v_subscription_used := p_cost;
    v_new_subscription := v_subscription_credits - p_cost;
    v_new_lifetime := v_lifetime_credits;
  ELSE
    v_subscription_used := v_subscription_credits;
    v_lifetime_used := p_cost - v_subscription_credits;
    v_new_subscription := 0;
    v_new_lifetime := v_lifetime_credits - v_lifetime_used;
  END IF;

  UPDATE public.user_wallets
  SET
    subscription_credits = v_new_subscription,
    lifetime_credits = v_new_lifetime,
    credits_total = v_new_subscription + v_new_lifetime,
    updated_at = now()
  WHERE user_id = p_user_id;

  IF v_subscription_used > 0 THEN
    INSERT INTO public.credit_transactions (user_id, delta, reason, credit_type, feature, metadata)
    VALUES (p_user_id, -v_subscription_used, 'usage', 'subscription', p_feature, jsonb_build_object('consumed', v_subscription_used));
  END IF;

  IF v_lifetime_used > 0 THEN
    INSERT INTO public.credit_transactions (user_id, delta, reason, credit_type, feature, metadata)
    VALUES (p_user_id, -v_lifetime_used, 'usage', 'lifetime', p_feature, jsonb_build_object('consumed', v_lifetime_used));
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'consumed', p_cost,
    'new_balance', v_new_subscription + v_new_lifetime,
    'subscription_balance', v_new_subscription,
    'lifetime_balance', v_new_lifetime
  );
END;
$function$;
