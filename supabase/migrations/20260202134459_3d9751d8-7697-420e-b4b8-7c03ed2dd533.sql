-- ============================================================
-- FIX: Admin Diagnostics Schema + RPC
-- ============================================================

-- 1) Add diagnostics columns to profiles for test B
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_diagnostics_at timestamptz,
ADD COLUMN IF NOT EXISTS diagnostics_meta jsonb DEFAULT '{}'::jsonb;

-- 2) Ensure user_gamification.best_streak_days exists (backfill if needed)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_gamification' 
    AND column_name = 'best_streak_days'
  ) THEN
    ALTER TABLE public.user_gamification ADD COLUMN best_streak_days integer DEFAULT 0;
  END IF;
END
$$;

-- Backfill best_streak_days from streak_days if not already done
UPDATE public.user_gamification
SET best_streak_days = GREATEST(COALESCE(best_streak_days, 0), COALESCE(streak_days, 0))
WHERE best_streak_days < streak_days OR best_streak_days IS NULL;

-- 3) Replace rpc_get_user_dashboard with fixed version
DROP FUNCTION IF EXISTS public.rpc_get_user_dashboard(uuid);

CREATE OR REPLACE FUNCTION public.rpc_get_user_dashboard(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_wallet jsonb;
  v_week jsonb;
  v_week_days jsonb;
  v_today_meal jsonb;
  v_shopping_list_status jsonb;
  v_streaks jsonb;
  v_gamification jsonb;
  v_advice_of_day jsonb;
  v_referral jsonb;
  v_week_start date;
  v_today date;
  v_advice_row record;
  v_day_offset int;
  v_current_date date;
  v_day_names text[] := ARRAY['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  v_day_entry jsonb;
  v_lunch jsonb;
  v_dinner jsonb;
BEGIN
  -- Auth guard: allow service_role OR auth.uid() = p_user_id
  IF current_setting('request.jwt.claim.role', true) != 'service_role' 
     AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Accès non autorisé';
  END IF;

  -- Calculate current week start (Monday) in Europe/Paris timezone
  v_today := (now() AT TIME ZONE 'Europe/Paris')::date;
  v_week_start := v_today - (EXTRACT(DOW FROM v_today)::int + 6) % 7;

  -- 1) WALLET
  SELECT jsonb_build_object(
    'balance_total', COALESCE(uw.subscription_credits, 0) + COALESCE(uw.lifetime_credits, 0),
    'balance_subscription', COALESCE(uw.subscription_credits, 0),
    'balance_lifetime', COALESCE(uw.lifetime_credits, 0)
  ) INTO v_wallet
  FROM public.user_wallets uw
  WHERE uw.user_id = p_user_id;
  
  IF v_wallet IS NULL THEN
    v_wallet := jsonb_build_object('balance_total', 0, 'balance_subscription', 0, 'balance_lifetime', 0);
  END IF;

  -- 2) Build week.days array with 7 entries (Monday to Sunday)
  v_week_days := '[]'::jsonb;
  
  FOR v_day_offset IN 0..6 LOOP
    v_current_date := v_week_start + v_day_offset;
    
    -- Get lunch recipe for this day
    SELECT jsonb_build_object(
      'recipe_id', r.id,
      'title', r.title,
      'image_url', COALESCE(r.image_url, ''),
      'image_path', COALESCE(r.image_path, ''),
      'prep_min', COALESCE(r.prep_time_min, 0),
      'calories', COALESCE(r.calories, r.calories_kcal, 0)
    ) INTO v_lunch
    FROM public.user_daily_recipes udr
    JOIN public.recipes r ON r.id = udr.lunch_recipe_id
    WHERE udr.user_id = p_user_id
      AND udr.date = v_current_date;
    
    -- Get dinner recipe for this day
    SELECT jsonb_build_object(
      'recipe_id', r.id,
      'title', r.title,
      'image_url', COALESCE(r.image_url, ''),
      'image_path', COALESCE(r.image_path, ''),
      'prep_min', COALESCE(r.prep_time_min, 0),
      'calories', COALESCE(r.calories, r.calories_kcal, 0)
    ) INTO v_dinner
    FROM public.user_daily_recipes udr
    JOIN public.recipes r ON r.id = udr.dinner_recipe_id
    WHERE udr.user_id = p_user_id
      AND udr.date = v_current_date;
    
    v_day_entry := jsonb_build_object(
      'date', v_current_date,
      'day_name', v_day_names[v_day_offset + 1],
      'day_index', v_day_offset + 1,
      'lunch', v_lunch,
      'dinner', v_dinner
    );
    
    v_week_days := v_week_days || v_day_entry;
  END LOOP;

  v_week := jsonb_build_object(
    'week_start', v_week_start,
    'menu_exists', (SELECT EXISTS(
      SELECT 1 FROM public.user_daily_recipes 
      WHERE user_id = p_user_id 
      AND date >= v_week_start 
      AND date < v_week_start + 7
    )),
    'meals_count', (SELECT COUNT(*) FROM public.user_daily_recipes 
                    WHERE user_id = p_user_id 
                    AND date >= v_week_start 
                    AND date < v_week_start + 7),
    'days', v_week_days
  );

  -- 3) TODAY'S MEAL
  SELECT jsonb_build_object(
    'exists', true,
    'lunch_recipe_id', udr.lunch_recipe_id,
    'lunch_title', lr.title,
    'dinner_recipe_id', udr.dinner_recipe_id,
    'dinner_title', dr.title
  ) INTO v_today_meal
  FROM public.user_daily_recipes udr
  LEFT JOIN public.recipes lr ON lr.id = udr.lunch_recipe_id
  LEFT JOIN public.recipes dr ON dr.id = udr.dinner_recipe_id
  WHERE udr.user_id = p_user_id
    AND udr.date = v_today
  LIMIT 1;
  
  IF v_today_meal IS NULL THEN
    v_today_meal := jsonb_build_object('exists', false, 'lunch_recipe_id', null, 'lunch_title', null, 'dinner_recipe_id', null, 'dinner_title', null);
  END IF;

  -- 4) SHOPPING LIST STATUS
  SELECT jsonb_build_object(
    'exists', gl.id IS NOT NULL,
    'items_total', COALESCE(jsonb_array_length(gl.items), 0),
    'items_checked', (
      SELECT COUNT(*) 
      FROM jsonb_array_elements(COALESCE(gl.items, '[]'::jsonb)) AS item 
      WHERE (item->>'checked')::boolean = true
    )
  ) INTO v_shopping_list_status
  FROM public.grocery_lists gl
  JOIN public.meal_plans mp ON mp.id = gl.weekly_menu_id
  WHERE gl.user_id = p_user_id
    AND mp.week_of = v_week_start
  LIMIT 1;
  
  IF v_shopping_list_status IS NULL THEN
    v_shopping_list_status := jsonb_build_object('exists', false, 'items_total', 0, 'items_checked', 0);
  END IF;

  -- 5) STREAKS (use best_streak_days, fallback to streak_days)
  SELECT jsonb_build_object(
    'current_days', COALESCE(ug.streak_days, 0),
    'best_days', COALESCE(ug.best_streak_days, ug.streak_days, 0)
  ) INTO v_streaks
  FROM public.user_gamification ug
  WHERE ug.user_id = p_user_id;
  
  IF v_streaks IS NULL THEN
    v_streaks := jsonb_build_object('current_days', 0, 'best_days', 0);
  END IF;

  -- 6) GAMIFICATION
  SELECT jsonb_build_object(
    'level', COALESCE(ug.level, 1),
    'xp', COALESCE(ug.points, 0),
    'xp_to_next', COALESCE(ug.level, 1) * 100,
    'badges', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('code', b.code, 'name', b.name, 'icon', b.icon))
       FROM public.user_badges ub
       JOIN public.badges b ON b.code = ub.badge_code
       WHERE ub.user_id = p_user_id),
      '[]'::jsonb
    )
  ) INTO v_gamification
  FROM public.user_gamification ug
  WHERE ug.user_id = p_user_id;
  
  IF v_gamification IS NULL THEN
    v_gamification := jsonb_build_object('level', 1, 'xp', 0, 'xp_to_next', 100, 'badges', '[]'::jsonb);
  END IF;

  -- 7) ADVICE OF THE DAY
  SELECT * INTO v_advice_row
  FROM public.daily_advice
  WHERE date = v_today AND is_active = true
  LIMIT 1;
  
  -- Fallback to latest active advice if none for today
  IF v_advice_row IS NULL THEN
    SELECT * INTO v_advice_row
    FROM public.daily_advice
    WHERE is_active = true
    ORDER BY date DESC
    LIMIT 1;
  END IF;
  
  IF v_advice_row IS NOT NULL THEN
    v_advice_of_day := jsonb_build_object(
      'id', v_advice_row.id,
      'title', v_advice_row.title,
      'text', v_advice_row.text,
      'category', v_advice_row.category,
      'date', v_advice_row.date,
      'is_today', v_advice_row.date = v_today
    );
  ELSE
    v_advice_of_day := jsonb_build_object(
      'id', null,
      'title', 'Bienvenue sur NutriZen',
      'text', 'Planifie tes repas pour gagner du temps et manger équilibré.',
      'category', 'motivation',
      'date', v_today,
      'is_today', true
    );
  END IF;

  -- 8) REFERRAL
  SELECT jsonb_build_object(
    'code', COALESCE(rc.code, ''),
    'has_code', rc.code IS NOT NULL,
    'clicks', COALESCE((SELECT COUNT(*) FROM public.referral_clicks WHERE referral_code = rc.code), 0),
    'signups', COALESCE((SELECT COUNT(*) FROM public.referral_events re WHERE re.referrer_user_id = p_user_id AND re.event_type = 'signup'), 0),
    'qualified', COALESCE((SELECT COUNT(*) FROM public.referral_events re WHERE re.referrer_user_id = p_user_id AND re.event_type = 'qualified'), 0),
    'rewards_earned', COALESCE((SELECT COUNT(*) FROM public.referral_events re WHERE re.referrer_user_id = p_user_id AND re.event_type = 'reward_granted'), 0)
  ) INTO v_referral
  FROM public.referral_codes rc
  WHERE rc.user_id = p_user_id;
  
  IF v_referral IS NULL THEN
    v_referral := jsonb_build_object('code', '', 'has_code', false, 'clicks', 0, 'signups', 0, 'qualified', 0, 'rewards_earned', 0);
  END IF;

  -- Build final result
  v_result := jsonb_build_object(
    'wallet', v_wallet,
    'week', v_week,
    'today_meal', v_today_meal,
    'shopping_list_status', v_shopping_list_status,
    'streaks', v_streaks,
    'gamification', v_gamification,
    'advice_of_day', v_advice_of_day,
    'referral', v_referral,
    'last_updated_at', now()
  );

  RETURN v_result;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.rpc_get_user_dashboard(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_get_user_dashboard(uuid) TO service_role;