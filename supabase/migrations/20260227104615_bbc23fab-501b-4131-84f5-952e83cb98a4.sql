-- Fix grant_welcome_credits: remove generated column "balance" from INSERT
CREATE OR REPLACE FUNCTION public.grant_welcome_credits(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_already_granted boolean;
BEGIN
  SELECT welcome_credits_granted INTO v_already_granted
  FROM public.profiles WHERE id = p_user_id;

  IF v_already_granted IS TRUE THEN
    RETURN jsonb_build_object('success', true, 'already_granted', true, 'credits', 0);
  END IF;

  INSERT INTO public.user_wallets (
    user_id, subscription_credits, lifetime_credits,
    credits_total, balance_purchased, balance_allowance
  )
  VALUES (p_user_id, 0, 14, 14, 14, 0)
  ON CONFLICT (user_id) DO UPDATE SET
    lifetime_credits  = public.user_wallets.lifetime_credits + 14,
    credits_total     = public.user_wallets.credits_total + 14,
    balance_purchased = public.user_wallets.balance_purchased + 14,
    updated_at        = now();

  UPDATE public.profiles
  SET welcome_credits_granted = true
  WHERE id = p_user_id;

  RETURN jsonb_build_object('success', true, 'already_granted', false, 'credits', 14);
END;
$$;

GRANT EXECUTE ON FUNCTION public.grant_welcome_credits(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.grant_welcome_credits(uuid) TO service_role;

-- Fix handle_new_user: add wallet creation + welcome credits + preferences
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;

  BEGIN
    INSERT INTO public.user_dashboard_stats (
      user_id, temps_gagne, charge_mentale_pct,
      serie_en_cours_set_count, credits_zen, references_count, objectif_hebdos_valide
    ) VALUES (NEW.id, 0, 0, 0, 10, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'dashboard_stats skipped: %', sqlerrm;
  END;

  BEGIN
    INSERT INTO public.user_gamification (user_id, points, level, streak_days, badges_count)
    VALUES (NEW.id, 0, 1, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'gamification skipped: %', sqlerrm;
  END;

  BEGIN
    INSERT INTO public.user_points (
      user_id, total_points, current_level, login_streak,
      meals_completed, meals_generated, referrals
    ) VALUES (NEW.id, 0, 'Bronze', 0, 0, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'user_points skipped: %', sqlerrm;
  END;

  BEGIN
    INSERT INTO public.user_wallets (
      user_id, subscription_credits, lifetime_credits,
      credits_total, balance_purchased, balance_allowance
    ) VALUES (NEW.id, 0, 14, 14, 14, 0)
    ON CONFLICT (user_id) DO NOTHING;

    UPDATE public.profiles
    SET welcome_credits_granted = true
    WHERE id = NEW.id AND welcome_credits_granted = false;
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'wallet/credits skipped: %', sqlerrm;
  END;

  BEGIN
    INSERT INTO public.preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'preferences skipped: %', sqlerrm;
  END;

  RETURN NEW;
END;
$$;

-- Fix missing enum value
ALTER TYPE gamification_event ADD VALUE IF NOT EXISTS 'PROFILE_COMPLETED';