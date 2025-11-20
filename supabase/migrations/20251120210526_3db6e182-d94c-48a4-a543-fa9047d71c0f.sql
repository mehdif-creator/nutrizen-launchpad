-- Security Fix: Add fixed search_path to update_user_streak_and_stats function
-- This prevents search_path manipulation attacks on SECURITY DEFINER functions

CREATE OR REPLACE FUNCTION public.update_user_streak_and_stats(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  -- Get today in Paris timezone
  v_today := (now() AT TIME ZONE 'Europe/Paris')::date;
  
  -- Get or create gamification record
  INSERT INTO user_gamification (user_id, streak_days, last_activity_date)
  VALUES (p_user_id, 0, NULL)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Get current streak and last login
  SELECT streak_days, last_activity_date 
  INTO v_current_streak, v_last_login
  FROM user_gamification
  WHERE user_id = p_user_id;
  
  -- Update streak logic
  IF v_last_login IS NULL OR v_last_login < v_today THEN
    -- First login ever or new day
    IF v_last_login IS NULL THEN
      v_current_streak := 1;
    ELSIF v_last_login = v_today - INTERVAL '1 day' THEN
      -- Consecutive day
      v_current_streak := v_current_streak + 1;
    ELSE
      -- Streak broken, reset to 1
      v_current_streak := 1;
    END IF;
    
    -- Update gamification
    UPDATE user_gamification
    SET 
      streak_days = v_current_streak,
      last_activity_date = v_today,
      points = points + 2,
      updated_at = now()
    WHERE user_id = p_user_id;
    
    -- Award app open event
    INSERT INTO user_events (user_id, event_type, points_delta, credits_delta, meta)
    VALUES (
      p_user_id,
      'APP_OPEN',
      2,
      0,
      jsonb_build_object('date', v_today, 'new_streak', v_current_streak)
    );
  END IF;
  
  -- Calculate dashboard stats using CORRECT table: user_weekly_menus
  SELECT COUNT(DISTINCT week_start)
  INTO v_menu_count
  FROM user_weekly_menus
  WHERE user_id = p_user_id;
  
  -- Estimate validated meals (menu count * 7 as proxy)
  v_validated_meals := v_menu_count * 7;
  
  -- Calculate time saved: ~15 min per planned meal
  v_time_saved := v_validated_meals * 15;
  
  -- Calculate mental load reduction: increase by 5% per menu, max 100%
  v_mental_load := LEAST(100, v_menu_count * 5);
  
  -- Get current credits from user_wallets
  SELECT COALESCE(credits_total, 0)
  INTO v_total_credits
  FROM user_wallets
  WHERE user_id = p_user_id;
  
  IF v_total_credits IS NULL THEN
    v_total_credits := 0;
  END IF;
  
  -- Count active referrals
  SELECT COUNT(*)
  INTO v_referral_count
  FROM user_referrals
  WHERE referrer_id = p_user_id
    AND status IN ('pending', 'completed');
  
  -- Update dashboard stats
  INSERT INTO user_dashboard_stats (
    user_id,
    temps_gagne,
    charge_mentale_pct,
    serie_en_cours_set_count,
    credits_zen,
    objectif_hebdos_valide,
    references_count
  ) VALUES (
    p_user_id,
    v_time_saved,
    v_mental_load,
    v_current_streak,
    v_total_credits,
    v_menu_count,
    v_referral_count
  )
  ON CONFLICT (user_id) DO UPDATE SET
    temps_gagne = EXCLUDED.temps_gagne,
    charge_mentale_pct = EXCLUDED.charge_mentale_pct,
    serie_en_cours_set_count = EXCLUDED.serie_en_cours_set_count,
    credits_zen = EXCLUDED.credits_zen,
    objectif_hebdos_valide = EXCLUDED.objectif_hebdos_valide,
    references_count = EXCLUDED.references_count;
  
  -- Return updated stats
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