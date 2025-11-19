-- Fix and complete dashboard stats and gamification system

-- 1. Create RPC function to update streak and award app open points
CREATE OR REPLACE FUNCTION update_user_streak_and_stats(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_today date;
  v_last_login date;
  v_current_streak int;
  v_menu_count int;
  v_validated_meals int;
  v_time_saved int;
  v_mental_load int;
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
      points = points + 2, -- +2 points for daily login
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
  
  -- Calculate dashboard stats
  -- Count generated menus (from meal_plans)
  SELECT COUNT(DISTINCT week_of)
  INTO v_menu_count
  FROM meal_plans
  WHERE user_id = p_user_id;
  
  -- Estimate validated meals (we'll use menu count * 7 as proxy for now)
  v_validated_meals := v_menu_count * 7;
  
  -- Calculate time saved: ~15 min per planned meal
  v_time_saved := v_validated_meals * 15;
  
  -- Calculate mental load reduction: increase by 5% per menu, max 100%
  v_mental_load := LEAST(100, v_menu_count * 5);
  
  -- Get current credits from user_wallets
  DECLARE
    v_total_credits int;
  BEGIN
    SELECT COALESCE(credits_total, 0)
    INTO v_total_credits
    FROM user_wallets
    WHERE user_id = p_user_id;
  EXCEPTION WHEN OTHERS THEN
    v_total_credits := 0;
  END;
  
  -- Update dashboard stats
  INSERT INTO user_dashboard_stats (
    user_id,
    temps_gagne,
    charge_mentale_pct,
    serie_en_cours_set_count,
    credits_zen,
    objectif_hebdos_valide
  ) VALUES (
    p_user_id,
    v_time_saved,
    v_mental_load,
    v_current_streak,
    v_total_credits,
    v_menu_count
  )
  ON CONFLICT (user_id) DO UPDATE SET
    temps_gagne = EXCLUDED.temps_gagne,
    charge_mentale_pct = EXCLUDED.charge_mentale_pct,
    serie_en_cours_set_count = EXCLUDED.serie_en_cours_set_count,
    credits_zen = EXCLUDED.credits_zen,
    objectif_hebdos_valide = EXCLUDED.objectif_hebdos_valide;
  
  -- Return updated stats
  RETURN jsonb_build_object(
    'streak_days', v_current_streak,
    'temps_gagne', v_time_saved,
    'charge_mentale_pct', v_mental_load,
    'credits_zen', v_total_credits,
    'objectif_hebdos_valide', v_menu_count,
    'was_updated', v_last_login IS NULL OR v_last_login < v_today
  );
END;
$$;

-- 2. Create function to sync credits from wallet to dashboard stats
CREATE OR REPLACE FUNCTION sync_dashboard_credits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  -- Update dashboard stats with current credit total
  UPDATE user_dashboard_stats
  SET credits_zen = NEW.credits_total
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-sync credits
DROP TRIGGER IF EXISTS sync_credits_to_dashboard ON user_wallets;
CREATE TRIGGER sync_credits_to_dashboard
  AFTER INSERT OR UPDATE OF credits_total ON user_wallets
  FOR EACH ROW
  EXECUTE FUNCTION sync_dashboard_credits();

-- 3. Create a unified dashboard stats getter
CREATE OR REPLACE FUNCTION get_dashboard_stats(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_stats jsonb;
  v_gamification jsonb;
  v_credits jsonb;
BEGIN
  -- Get dashboard stats
  SELECT to_jsonb(s.*) INTO v_stats
  FROM user_dashboard_stats s
  WHERE s.user_id = p_user_id;
  
  -- Get gamification stats
  SELECT to_jsonb(g.*) INTO v_gamification
  FROM user_gamification g
  WHERE g.user_id = p_user_id;
  
  -- Get credits breakdown
  SELECT jsonb_build_object(
    'total', COALESCE(credits_total, 0),
    'subscription', COALESCE(subscription_credits, 0),
    'lifetime', COALESCE(lifetime_credits, 0),
    'points', COALESCE(points_total, 0)
  ) INTO v_credits
  FROM user_wallets
  WHERE user_id = p_user_id;
  
  -- Merge and return
  RETURN jsonb_build_object(
    'stats', COALESCE(v_stats, '{}'::jsonb),
    'gamification', COALESCE(v_gamification, '{}'::jsonb),
    'credits', COALESCE(v_credits, '{"total":0,"subscription":0,"lifetime":0,"points":0}'::jsonb)
  );
END;
$$;