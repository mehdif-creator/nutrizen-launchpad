-- ============================================================================
-- Script de réinitialisation complète du compte mouldi493@gmail.com
-- À exécuter dans le SQL Editor de Supabase
-- ============================================================================

-- Variables
DO $$
DECLARE
  v_user_id uuid;
  v_current_month date;
  v_new_trial_end timestamp with time zone;
BEGIN
  -- Récupérer l'ID utilisateur
  SELECT id INTO v_user_id
  FROM profiles
  WHERE email = 'mouldi493@gmail.com';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found: mouldi493@gmail.com';
  END IF;

  -- Date du mois en cours
  v_current_month := DATE_TRUNC('month', CURRENT_DATE)::date;
  
  -- Nouvelle date de fin de trial (30 jours)
  v_new_trial_end := NOW() + INTERVAL '30 days';

  RAISE NOTICE 'Resetting user: % (ID: %)', 'mouldi493@gmail.com', v_user_id;

  -- 1. Réinitialiser les swaps du mois en cours
  INSERT INTO swaps (user_id, month, used, quota)
  VALUES (v_user_id, v_current_month, 0, 10)
  ON CONFLICT (user_id, month) 
  DO UPDATE SET 
    used = 0, 
    quota = 10;
  
  RAISE NOTICE '✓ Swaps reset: 0/10';

  -- 2. Réinitialiser user_gamification
  UPDATE user_gamification 
  SET 
    points = 0,
    level = 1,
    streak_days = 0,
    badges_count = 0,
    last_activity_date = NULL,
    updated_at = NOW()
  WHERE user_id = v_user_id;
  
  RAISE NOTICE '✓ Gamification reset: 0 points, level 1, 0 streak';

  -- 3. Réinitialiser user_dashboard_stats
  UPDATE user_dashboard_stats
  SET 
    credits_zen = 10,
    temps_gagne = 0,
    charge_mentale_pct = 0,
    objectif_hebdos_valide = 0,
    serie_en_cours_set_count = 0,
    references_count = 0
  WHERE user_id = v_user_id;
  
  RAISE NOTICE '✓ Dashboard stats reset: 10 credits';

  -- 4. Réinitialiser user_points
  UPDATE user_points
  SET 
    total_points = 0,
    current_level = 'Bronze',
    login_streak = 0,
    meals_generated = 0,
    meals_completed = 0,
    referrals = 0,
    last_login_date = NULL,
    updated_at = NOW()
  WHERE user_id = v_user_id;
  
  RAISE NOTICE '✓ User points reset: Bronze level';

  -- 5. Prolonger le trial de 30 jours
  UPDATE subscriptions
  SET 
    trial_end = v_new_trial_end,
    updated_at = NOW()
  WHERE user_id = v_user_id;
  
  RAISE NOTICE '✓ Trial extended to: %', v_new_trial_end;

  -- 6. Supprimer les meal plans
  DELETE FROM meal_plans 
  WHERE user_id = v_user_id;
  
  RAISE NOTICE '✓ Meal plans deleted';

  -- 7. Supprimer les menus hebdomadaires
  DELETE FROM user_weekly_menus 
  WHERE user_id = v_user_id;
  
  RAISE NOTICE '✓ Weekly menus deleted';

  -- 8. Supprimer les ratings de repas (via les meal_plans)
  DELETE FROM meal_ratings
  WHERE meal_plan_id IN (
    SELECT id FROM meal_plans WHERE user_id = v_user_id
  );
  
  RAISE NOTICE '✓ Meal ratings deleted';

  -- Résumé final
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE 'RESET COMPLETED SUCCESSFULLY';
  RAISE NOTICE 'User: mouldi493@gmail.com';
  RAISE NOTICE 'User ID: %', v_user_id;
  RAISE NOTICE 'New trial end: %', v_new_trial_end;
  RAISE NOTICE '═══════════════════════════════════════════════════════';

END $$;
