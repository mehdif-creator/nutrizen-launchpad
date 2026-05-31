
CREATE OR REPLACE FUNCTION public.rpc_admin_dashboard_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
  v_now timestamptz := now();
  v_month_start timestamptz := date_trunc('month', v_now);
  v_week_start timestamptz := v_now - interval '7 days';
  v_30d_ago timestamptz := v_now - interval '30 days';

  v_total_users int;
  v_new_month int;
  v_new_week int;
  v_active_subs int;
  v_trial_users int;
  v_cancellations_30d int;
  v_paid_at_period_start int;

  v_mrr numeric := 0;
  v_arpu numeric := 0;
  v_churn numeric := 0;
  v_conv numeric := 0;

  v_trial_started int;
  v_trial_converted int;

  v_open_tickets int;
  v_total_menus int;
  v_distinct_menu_users int;
  v_menus_per_user numeric := 0;

  v_ratings_count int;
  v_ratings_avg numeric;
  v_total_points bigint;

  -- monthly prices in EUR
  v_price_starter numeric := 12.99;
  v_price_premium numeric := 19.99;
  v_annual_factor numeric := 0.8; -- yearly = monthly*12*0.8 → monthly equiv = monthly*0.8
BEGIN
  v_is_admin := public.has_role(auth.uid(), 'admin'::public.app_role);
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT count(*) INTO v_total_users FROM public.profiles;
  SELECT count(*) INTO v_new_month FROM public.profiles WHERE created_at >= v_month_start;
  SELECT count(*) INTO v_new_week FROM public.profiles WHERE created_at >= v_week_start;

  SELECT count(*) INTO v_active_subs FROM public.subscriptions WHERE status = 'active';
  SELECT count(*) INTO v_trial_users FROM public.subscriptions WHERE status = 'trialing';

  -- MRR: sum monthly-normalized price across active subscriptions
  SELECT COALESCE(SUM(
    CASE
      WHEN plan ILIKE '%premium%' THEN v_price_premium
      WHEN plan ILIKE '%starter%' THEN v_price_starter
      ELSE v_price_starter
    END
    * CASE WHEN billing_interval = 'year' THEN v_annual_factor ELSE 1 END
  ), 0)
  INTO v_mrr
  FROM public.subscriptions
  WHERE status = 'active';

  IF v_active_subs > 0 THEN
    v_arpu := v_mrr / v_active_subs;
  END IF;

  -- Trial → paid conversion (all-time, based on subscriptions)
  SELECT count(*) INTO v_trial_started FROM public.subscriptions WHERE trial_start IS NOT NULL;
  SELECT count(*) INTO v_trial_converted
    FROM public.subscriptions
    WHERE trial_start IS NOT NULL AND status = 'active';
  IF v_trial_started > 0 THEN
    v_conv := (v_trial_converted::numeric / v_trial_started::numeric) * 100;
  END IF;

  -- Churn (rolling 30 days)
  SELECT count(*) INTO v_cancellations_30d
    FROM public.subscriptions
    WHERE status = 'canceled' AND updated_at >= v_30d_ago;
  -- paid subscribers at start of period ≈ active now + cancellations in period
  v_paid_at_period_start := v_active_subs + v_cancellations_30d;
  IF v_paid_at_period_start > 0 THEN
    v_churn := (v_cancellations_30d::numeric / v_paid_at_period_start::numeric) * 100;
  END IF;

  SELECT count(*) INTO v_open_tickets FROM public.support_tickets WHERE status = 'open';

  SELECT count(*), count(DISTINCT user_id)
    INTO v_total_menus, v_distinct_menu_users
    FROM public.meal_plans;
  IF v_distinct_menu_users > 0 THEN
    v_menus_per_user := v_total_menus::numeric / v_distinct_menu_users::numeric;
  END IF;

  SELECT count(*), AVG(stars) INTO v_ratings_count, v_ratings_avg FROM public.meal_ratings;
  SELECT COALESCE(SUM(total_points), 0) INTO v_total_points FROM public.user_points;

  RETURN jsonb_build_object(
    'financial', jsonb_build_object(
      'mrr', round(v_mrr::numeric, 2),
      'arpu', round(v_arpu::numeric, 2),
      'trialToPaidConversionRate', round(v_conv::numeric, 2),
      'churnRate', round(v_churn::numeric, 2),
      'cancellationsCount', v_cancellations_30d
    ),
    'users', jsonb_build_object(
      'totalUsers', v_total_users,
      'activeSubscribers', v_active_subs,
      'trialUsers', v_trial_users,
      'newUsersThisMonth', v_new_month,
      'newUsersThisWeek', v_new_week,
      'openTickets', v_open_tickets
    ),
    'engagement', jsonb_build_object(
      'totalMenusCreated', v_total_menus,
      'menusPerUserAvg', round(v_menus_per_user::numeric, 2),
      'ratingsCount', v_ratings_count,
      'ratingsAvg', COALESCE(round(v_ratings_avg::numeric, 2), 0),
      'totalPoints', v_total_points
    ),
    'updatedAt', v_now
  );
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_admin_dashboard_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rpc_admin_dashboard_stats() TO authenticated, service_role;
