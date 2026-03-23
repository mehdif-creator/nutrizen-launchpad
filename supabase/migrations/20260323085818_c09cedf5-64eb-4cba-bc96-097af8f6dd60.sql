
-- 1. Add missing columns to user_referrals
ALTER TABLE public.user_referrals 
  ADD COLUMN IF NOT EXISTS rewarded boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS referral_code text;

-- 2. Make referral_events columns nullable for event logging flexibility
ALTER TABLE public.referral_events ALTER COLUMN referrer_user_id DROP NOT NULL;
ALTER TABLE public.referral_events ALTER COLUMN referred_user_id DROP NOT NULL;
ALTER TABLE public.referral_events ALTER COLUMN idempotency_key DROP NOT NULL;

-- 3. Fix handle_referral_signup
CREATE OR REPLACE FUNCTION public.handle_referral_signup(p_referral_code text, p_new_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_referrer_id uuid;
  v_referral_exists boolean;
  v_idempotency_key text;
BEGIN
  v_idempotency_key := 'ref_signup:' || p_new_user_id::text;
  SELECT user_id INTO v_referrer_id FROM public.referral_codes WHERE code = upper(p_referral_code);
  IF v_referrer_id IS NULL THEN
    INSERT INTO public.referral_events (referrer_user_id, referred_user_id, event_type, referral_code, status, error_message, idempotency_key)
    VALUES (NULL, p_new_user_id, 'signup_failed', p_referral_code, 'failed', 'Invalid referral code', v_idempotency_key || ':invalid')
    ON CONFLICT DO NOTHING;
    RETURN jsonb_build_object('success', false, 'message', 'Code de parrainage invalide');
  END IF;
  IF v_referrer_id = p_new_user_id THEN
    INSERT INTO public.referral_events (referrer_user_id, referred_user_id, event_type, referral_code, status, error_message, idempotency_key)
    VALUES (v_referrer_id, p_new_user_id, 'signup_rejected', p_referral_code, 'rejected', 'Self-referral blocked', v_idempotency_key || ':self')
    ON CONFLICT DO NOTHING;
    RETURN jsonb_build_object('success', false, 'message', 'Auto-parrainage non autorisé');
  END IF;
  SELECT EXISTS(SELECT 1 FROM public.user_referrals WHERE referred_user_id = p_new_user_id) INTO v_referral_exists;
  IF v_referral_exists THEN
    RETURN jsonb_build_object('success', false, 'already_attributed', true, 'message', 'Parrainage déjà enregistré');
  END IF;
  INSERT INTO public.user_referrals (referrer_id, referred_user_id, status, referral_code)
  VALUES (v_referrer_id, p_new_user_id, 'SIGNED_UP', upper(p_referral_code))
  ON CONFLICT (referred_user_id) DO NOTHING;
  INSERT INTO public.referral_attributions (referrer_user_id, referred_user_id, source)
  VALUES (v_referrer_id, p_new_user_id, 'referral_code')
  ON CONFLICT (referred_user_id) DO NOTHING;
  INSERT INTO public.user_events (user_id, event_type, points_delta, credits_delta, meta)
  VALUES (v_referrer_id, 'REFERRAL_COMPLETED', 0, 10,
    jsonb_build_object('referred_user_id', p_new_user_id, 'referral_code', p_referral_code));
  INSERT INTO public.referral_events (referrer_user_id, referred_user_id, event_type, referral_code, status, idempotency_key, metadata)
  VALUES (v_referrer_id, p_new_user_id, 'signup', upper(p_referral_code), 'success', v_idempotency_key,
    jsonb_build_object('credits_awarded', 10))
  ON CONFLICT DO NOTHING;
  RETURN jsonb_build_object('success', true, 'message', 'Parrainage enregistré avec succès', 'referrer_id', v_referrer_id);
END;
$$;

-- 4. Fix handle_referred_user_subscribed - now uses rewarded column
CREATE OR REPLACE FUNCTION public.handle_referred_user_subscribed(p_user_id uuid, p_referral_code text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_referrer_id uuid; v_subscribed_count integer; v_unrewarded_count integer;
  v_free_months_to_award integer; v_bonus_credits integer := 20;
  v_idempotency_key text; v_already_processed boolean;
BEGIN
  v_idempotency_key := 'ref_subscribed:' || p_user_id::text;
  SELECT EXISTS(SELECT 1 FROM public.referral_events WHERE idempotency_key = v_idempotency_key AND status = 'success') INTO v_already_processed;
  IF v_already_processed THEN RETURN jsonb_build_object('success', true, 'idempotent_hit', true, 'message', 'Already processed'); END IF;
  SELECT referrer_id INTO v_referrer_id FROM public.user_referrals WHERE referred_user_id = p_user_id AND status = 'SIGNED_UP' LIMIT 1;
  IF v_referrer_id IS NULL THEN
    INSERT INTO public.referral_events (referrer_user_id, referred_user_id, event_type, referral_code, status, error_message, idempotency_key)
    VALUES (NULL, p_user_id, 'subscription_no_referrer', p_referral_code, 'skipped', 'No pending referral found', v_idempotency_key || ':none')
    ON CONFLICT DO NOTHING;
    RETURN jsonb_build_object('success', false, 'message', 'No pending referral found');
  END IF;
  UPDATE public.user_referrals SET status = 'SUBSCRIBED', rewarded = false, updated_at = now()
  WHERE referred_user_id = p_user_id AND referrer_id = v_referrer_id;
  SELECT COUNT(*) INTO v_subscribed_count FROM public.user_referrals WHERE referrer_id = v_referrer_id AND status = 'SUBSCRIBED';
  SELECT COUNT(*) INTO v_unrewarded_count FROM public.user_referrals
  WHERE referrer_id = v_referrer_id AND status = 'SUBSCRIBED' AND (rewarded IS NULL OR rewarded = false);
  v_free_months_to_award := v_unrewarded_count / 5;
  IF v_free_months_to_award > 0 THEN
    UPDATE public.user_referrals SET rewarded = true, updated_at = now()
    WHERE id IN (SELECT id FROM public.user_referrals WHERE referrer_id = v_referrer_id AND status = 'SUBSCRIBED' AND (rewarded IS NULL OR rewarded = false) ORDER BY created_at ASC LIMIT (v_free_months_to_award * 5));
    UPDATE public.user_wallets SET free_months_earned = COALESCE(free_months_earned,0) + v_free_months_to_award, updated_at = now() WHERE user_id = v_referrer_id;
    UPDATE public.user_wallets SET credits_total = COALESCE(credits_total,0) + v_bonus_credits, lifetime_credits_earned = COALESCE(lifetime_credits_earned,0) + v_bonus_credits, updated_at = now() WHERE user_id = v_referrer_id;
    INSERT INTO public.user_credit_lots (user_id, credits, expires_at) VALUES (v_referrer_id, v_bonus_credits, now() + interval '1 year');
    INSERT INTO public.user_events (user_id, event_type, points_delta, credits_delta, meta) VALUES (v_referrer_id, 'REFERRAL_MILESTONE', 50, v_bonus_credits, jsonb_build_object('free_months_earned', v_free_months_to_award, 'total_subscribed', v_subscribed_count));
    UPDATE public.user_wallets SET points_total = COALESCE(points_total,0) + 50, lifetime_points = COALESCE(lifetime_points,0) + 50, updated_at = now() WHERE user_id = v_referrer_id;
  END IF;
  INSERT INTO public.referral_events (referrer_user_id, referred_user_id, event_type, referral_code, status, idempotency_key, metadata)
  VALUES (v_referrer_id, p_user_id, 'qualified', p_referral_code, 'success', v_idempotency_key,
    jsonb_build_object('subscribed_count', v_subscribed_count, 'free_months_awarded', v_free_months_to_award, 'bonus_credits', CASE WHEN v_free_months_to_award > 0 THEN v_bonus_credits ELSE 0 END))
  ON CONFLICT DO NOTHING;
  RETURN jsonb_build_object('success', true, 'referrer_id', v_referrer_id, 'subscribed_count', v_subscribed_count, 'free_months_awarded', v_free_months_to_award, 'bonus_credits', CASE WHEN v_free_months_to_award > 0 THEN v_bonus_credits ELSE 0 END);
END;
$$;

-- 5. Improved repair functions
CREATE OR REPLACE FUNCTION public.repair_affiliate_attribution(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_aff_code text; v_aff_user_id uuid; v_has_commission boolean; v_customer_id text;
BEGIN
  SELECT affiliate_code INTO v_aff_code FROM public.affiliate_referrals WHERE referred_user_id = p_user_id LIMIT 1;
  IF v_aff_code IS NULL THEN RETURN jsonb_build_object('repaired', false, 'reason', 'No affiliate attribution found'); END IF;
  SELECT user_id INTO v_aff_user_id FROM public.affiliates WHERE affiliate_code = v_aff_code AND is_active = true;
  IF v_aff_user_id IS NULL THEN RETURN jsonb_build_object('repaired', false, 'reason', 'Affiliate inactive'); END IF;
  SELECT stripe_customer_id INTO v_customer_id FROM public.profiles WHERE id = p_user_id;
  IF v_customer_id IS NOT NULL THEN
    UPDATE public.affiliate_referrals SET stripe_customer_id = v_customer_id WHERE referred_user_id = p_user_id AND (stripe_customer_id IS NULL OR stripe_customer_id = '');
  END IF;
  SELECT EXISTS(SELECT 1 FROM public.affiliate_commissions WHERE referred_user_id = p_user_id) INTO v_has_commission;
  IF v_has_commission THEN UPDATE public.affiliate_referrals SET converted = true WHERE referred_user_id = p_user_id AND converted = false; END IF;
  INSERT INTO public.affiliate_events (affiliate_code, affiliate_user_id, referred_user_id, event_type, status, source, metadata)
  VALUES (v_aff_code, v_aff_user_id, p_user_id, 'repair', 'success', 'repair_rpc', jsonb_build_object('has_commission', v_has_commission, 'customer_id', v_customer_id));
  RETURN jsonb_build_object('repaired', true, 'affiliate_code', v_aff_code, 'has_commission', v_has_commission);
END;
$$;

CREATE OR REPLACE FUNCTION public.repair_referral_attribution(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_referrer_id uuid; v_code text; v_has_attribution boolean;
BEGIN
  SELECT referrer_id, referral_code INTO v_referrer_id, v_code FROM public.user_referrals WHERE referred_user_id = p_user_id LIMIT 1;
  IF v_referrer_id IS NULL THEN RETURN jsonb_build_object('repaired', false, 'reason', 'No referral found'); END IF;
  SELECT EXISTS(SELECT 1 FROM public.referral_attributions WHERE referred_user_id = p_user_id) INTO v_has_attribution;
  IF NOT v_has_attribution THEN
    INSERT INTO public.referral_attributions (referrer_user_id, referred_user_id, source) VALUES (v_referrer_id, p_user_id, 'repair') ON CONFLICT (referred_user_id) DO NOTHING;
  END IF;
  INSERT INTO public.referral_events (referrer_user_id, referred_user_id, event_type, referral_code, status, metadata)
  VALUES (v_referrer_id, p_user_id, 'repair', v_code, 'success', jsonb_build_object('had_attribution', v_has_attribution));
  RETURN jsonb_build_object('repaired', true, 'referrer_id', v_referrer_id, 'code', v_code);
END;
$$;

GRANT EXECUTE ON FUNCTION public.handle_referral_signup TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.handle_referred_user_subscribed TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.repair_referral_attribution TO authenticated;
GRANT EXECUTE ON FUNCTION public.repair_affiliate_attribution TO authenticated;
