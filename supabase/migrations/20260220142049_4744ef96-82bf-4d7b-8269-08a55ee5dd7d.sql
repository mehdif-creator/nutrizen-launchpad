-- ============================================================================
-- SECURITY FIX: Add SET search_path = '' to all SECURITY DEFINER functions
-- This prevents search_path hijacking attacks where an attacker could shadow
-- built-in functions or tables by creating objects in the public schema.
-- ============================================================================

-- ============================================================================
-- From: 20251112202338 (referral system)
-- Functions: generate_referral_code, auto_generate_referral_code,
--            handle_referral_signup, get_active_referrals_count
-- ============================================================================

CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_code text;
  code_exists boolean;
BEGIN
  LOOP
    new_code := lower(substring(md5(random()::text || clock_timestamp()::text) from 1 for 10));
    SELECT EXISTS(
      SELECT 1 FROM public.user_profiles WHERE referral_code = new_code
    ) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_generate_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := public.generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_referral_signup(
  p_referral_code text,
  p_new_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_referrer_id uuid;
  v_referral_exists boolean;
BEGIN
  SELECT id INTO v_referrer_id
  FROM public.user_profiles
  WHERE referral_code = p_referral_code;

  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Code de parrainage invalide');
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.user_referrals WHERE referred_user_id = p_new_user_id
  ) INTO v_referral_exists;

  IF v_referral_exists THEN
    RETURN jsonb_build_object('success', false, 'message', 'Vous avez déjà utilisé un code de parrainage');
  END IF;

  INSERT INTO public.user_referrals (referrer_id, referred_user_id, status)
  VALUES (v_referrer_id, p_new_user_id, 'SIGNED_UP');

  INSERT INTO public.user_events (user_id, event_type, points_delta, credits_delta, meta)
  VALUES (
    v_referrer_id,
    'REFERRAL_COMPLETED',
    0,
    10,
    jsonb_build_object('referred_user_id', p_new_user_id, 'referral_code', p_referral_code)
  );

  RETURN jsonb_build_object('success', true, 'message', 'Parrainage enregistré avec succès', 'referrer_id', v_referrer_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_active_referrals_count(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COUNT(*)::integer
  FROM public.user_referrals
  WHERE referrer_id = p_user_id
    AND status = 'SIGNED_UP'
    AND referred_user_id IS NOT NULL;
$$;

-- ============================================================================
-- From: 20251119174207 (credits system)
-- Functions: check_and_consume_credits, add_credits_from_purchase
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_and_consume_credits(
  p_user_id uuid,
  p_feature text,
  p_cost integer DEFAULT 1
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_subscription_credits integer;
  v_lifetime_credits integer;
  v_total_available integer;
  v_subscription_used integer := 0;
  v_lifetime_used integer := 0;
  v_new_subscription integer;
  v_new_lifetime integer;
BEGIN
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
$$;

CREATE OR REPLACE FUNCTION public.add_credits_from_purchase(
  p_user_id uuid,
  p_amount integer,
  p_credit_type text DEFAULT 'lifetime',
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_new_subscription integer;
  v_new_lifetime integer;
  v_new_total integer;
BEGIN
  IF p_credit_type NOT IN ('subscription', 'lifetime') THEN
    RAISE EXCEPTION 'Invalid credit type: %', p_credit_type;
  END IF;

  INSERT INTO public.user_wallets (user_id, subscription_credits, lifetime_credits, credits_total)
  VALUES (
    p_user_id,
    CASE WHEN p_credit_type = 'subscription' THEN p_amount ELSE 0 END,
    CASE WHEN p_credit_type = 'lifetime' THEN p_amount ELSE 0 END,
    p_amount
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    subscription_credits = CASE
      WHEN p_credit_type = 'subscription' THEN public.user_wallets.subscription_credits + p_amount
      ELSE public.user_wallets.subscription_credits
    END,
    lifetime_credits = CASE
      WHEN p_credit_type = 'lifetime' THEN public.user_wallets.lifetime_credits + p_amount
      ELSE public.user_wallets.lifetime_credits
    END,
    credits_total = public.user_wallets.subscription_credits + public.user_wallets.lifetime_credits +
      CASE WHEN p_credit_type = 'subscription' THEN p_amount ELSE 0 END +
      CASE WHEN p_credit_type = 'lifetime' THEN p_amount ELSE 0 END,
    updated_at = now()
  RETURNING subscription_credits, lifetime_credits, credits_total
  INTO v_new_subscription, v_new_lifetime, v_new_total;

  INSERT INTO public.credit_transactions (user_id, delta, reason, credit_type, metadata)
  VALUES (p_user_id, p_amount, 'purchase', p_credit_type, p_metadata);

  RETURN jsonb_build_object(
    'success', true,
    'subscription_balance', v_new_subscription,
    'lifetime_balance', v_new_lifetime,
    'total_balance', v_new_total
  );
END;
$$;

-- ============================================================================
-- From: 20251120094957 (get_weekly_recipes_by_day)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_weekly_recipes_by_day(
  p_user_id uuid,
  p_week_start date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_week_start date;
  v_menu_record record;
  v_result jsonb := '[]'::jsonb;
  v_day_index int;
  v_days jsonb := '[]'::jsonb;
BEGIN
  IF p_week_start IS NULL THEN
    v_week_start := date_trunc('week', CURRENT_DATE)::date + 1;
  ELSE
    v_week_start := p_week_start;
  END IF;

  SELECT * INTO v_menu_record
  FROM public.user_weekly_menus
  WHERE user_id = p_user_id
    AND week_start = v_week_start
  LIMIT 1;

  IF v_menu_record IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  FOR v_day_index IN 0..6 LOOP
    DECLARE
      v_current_date date := v_week_start + v_day_index;
      v_day_name text :=
        CASE v_day_index
          WHEN 0 THEN 'Lundi'
          WHEN 1 THEN 'Mardi'
          WHEN 2 THEN 'Mercredi'
          WHEN 3 THEN 'Jeudi'
          WHEN 4 THEN 'Vendredi'
          WHEN 5 THEN 'Samedi'
          WHEN 6 THEN 'Dimanche'
        END;
      v_lunch_recipe jsonb;
      v_dinner_recipe jsonb;
    BEGIN
      SELECT jsonb_build_object(
        'recipe_id', r.id,
        'title', r.title,
        'image_url', r.image_url,
        'prep_min', COALESCE(r.prep_time_min, 0),
        'total_min', COALESCE(r.total_time_min, 0),
        'calories', COALESCE(r.calories_kcal, 0),
        'proteins_g', COALESCE(r.proteins_g, 0),
        'carbs_g', COALESCE(r.carbs_g, 0),
        'fats_g', COALESCE(r.fats_g, 0),
        'servings', COALESCE(r.base_servings, 1)
      ) INTO v_lunch_recipe
      FROM public.user_weekly_menu_items mi
      JOIN public.recipes r ON r.id = mi.recipe_id
      WHERE mi.weekly_menu_id = v_menu_record.menu_id
        AND mi.day_of_week = v_day_index
        AND mi.meal_slot = 'lunch'
      LIMIT 1;

      SELECT jsonb_build_object(
        'recipe_id', r.id,
        'title', r.title,
        'image_url', r.image_url,
        'prep_min', COALESCE(r.prep_time_min, 0),
        'total_min', COALESCE(r.total_time_min, 0),
        'calories', COALESCE(r.calories_kcal, 0),
        'proteins_g', COALESCE(r.proteins_g, 0),
        'carbs_g', COALESCE(r.carbs_g, 0),
        'fats_g', COALESCE(r.fats_g, 0),
        'servings', COALESCE(r.base_servings, 1)
      ) INTO v_dinner_recipe
      FROM public.user_weekly_menu_items mi
      JOIN public.recipes r ON r.id = mi.recipe_id
      WHERE mi.weekly_menu_id = v_menu_record.menu_id
        AND mi.day_of_week = v_day_index
        AND mi.meal_slot = 'dinner'
      LIMIT 1;

      v_days := v_days || jsonb_build_object(
        'date', v_current_date,
        'day_name', v_day_name,
        'day_index', v_day_index,
        'lunch', v_lunch_recipe,
        'dinner', v_dinner_recipe
      );
    END;
  END LOOP;

  RETURN v_days;
END;
$$;

-- ============================================================================
-- From: 20251120102832 (update_user_streak_and_stats)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_user_streak_and_stats(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_today date;
  v_last_login date;
  v_current_streak int;
  v_menu_count int;
  v_validated_meals int;
  v_time_saved int;
  v_mental_load int;
  v_total_credits int;
  v_referral_count int;
BEGIN
  v_today := (now() AT TIME ZONE 'Europe/Paris')::date;

  INSERT INTO public.user_gamification (user_id, streak_days, last_activity_date)
  VALUES (p_user_id, 0, NULL)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT streak_days, last_activity_date
  INTO v_current_streak, v_last_login
  FROM public.user_gamification
  WHERE user_id = p_user_id;

  IF v_last_login IS NULL OR v_last_login < v_today THEN
    IF v_last_login IS NULL THEN
      v_current_streak := 1;
    ELSIF v_last_login = v_today - INTERVAL '1 day' THEN
      v_current_streak := v_current_streak + 1;
    ELSE
      v_current_streak := 1;
    END IF;

    UPDATE public.user_gamification
    SET
      streak_days = v_current_streak,
      last_activity_date = v_today,
      points = points + 2,
      updated_at = now()
    WHERE user_id = p_user_id;

    INSERT INTO public.user_events (user_id, event_type, points_delta, credits_delta, meta)
    VALUES (
      p_user_id,
      'APP_OPEN',
      2,
      0,
      jsonb_build_object('date', v_today, 'new_streak', v_current_streak)
    );
  END IF;

  SELECT COUNT(DISTINCT week_start)
  INTO v_menu_count
  FROM public.user_weekly_menus
  WHERE user_id = p_user_id;

  v_validated_meals := v_menu_count * 7;
  v_time_saved := v_validated_meals * 15;
  v_mental_load := LEAST(100, v_menu_count * 5);

  SELECT COALESCE(credits_total, 0)
  INTO v_total_credits
  FROM public.user_wallets
  WHERE user_id = p_user_id;

  IF v_total_credits IS NULL THEN
    v_total_credits := 0;
  END IF;

  SELECT COUNT(*)
  INTO v_referral_count
  FROM public.user_referrals
  WHERE referrer_id = p_user_id
    AND status IN ('pending', 'completed');

  INSERT INTO public.user_dashboard_stats (
    user_id, temps_gagne, charge_mentale_pct, serie_en_cours_set_count,
    credits_zen, objectif_hebdos_valide, references_count
  ) VALUES (
    p_user_id, v_time_saved, v_mental_load, v_current_streak,
    v_total_credits, v_menu_count, v_referral_count
  )
  ON CONFLICT (user_id) DO UPDATE SET
    temps_gagne = EXCLUDED.temps_gagne,
    charge_mentale_pct = EXCLUDED.charge_mentale_pct,
    serie_en_cours_set_count = EXCLUDED.serie_en_cours_set_count,
    credits_zen = EXCLUDED.credits_zen,
    objectif_hebdos_valide = EXCLUDED.objectif_hebdos_valide,
    references_count = EXCLUDED.references_count;

  RETURN jsonb_build_object(
    'streak_days', v_current_streak,
    'temps_gagne', v_time_saved,
    'charge_mentale_pct', v_mental_load,
    'credits_zen', v_total_credits,
    'objectif_hebdos_valide', v_menu_count,
    'references_count', v_referral_count,
    'was_updated', v_last_login IS NULL OR v_last_login < v_today
  );
END;
$$;