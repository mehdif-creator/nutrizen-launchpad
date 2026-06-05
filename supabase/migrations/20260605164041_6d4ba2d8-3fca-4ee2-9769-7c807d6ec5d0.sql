-- Fix admin dashboard metrics: trial detection fallback + correct menu source

CREATE OR REPLACE FUNCTION public.rpc_admin_dashboard_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_month_start timestamptz := date_trunc('month', v_now);
  v_week_start timestamptz := v_now - interval '7 days';
  v_30d_ago timestamptz := v_now - interval '30 days';
  v_trial_window interval := interval '14 days';

  v_total_users int;
  v_new_month int;
  v_new_week int;

  v_active_paid int;
  v_trialing_stripe int;
  v_trialing_implicit int;
  v_trialing int;

  v_mrr numeric := 0;
  v_arpu numeric := 0;
  v_mrr_unpriced int := 0;

  v_cancellations_30d int;
  v_active_at_period_start int;
  v_churn numeric := 0;

  v_cohort_total int;
  v_cohort_converted int;
  v_conv numeric := 0;

  v_open_tickets int;
  v_total_menus int;
  v_distinct_menu_users int;
  v_menus_per_user numeric := 0;
  v_ratings_count int;
  v_ratings_avg numeric;
  v_total_points bigint;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT count(*) INTO v_total_users FROM public.profiles;
  SELECT count(*) INTO v_new_month FROM public.profiles WHERE created_at >= v_month_start;
  SELECT count(*) INTO v_new_week  FROM public.profiles WHERE created_at >= v_week_start;

  -- Paid subscribers: Stripe status='active' AND past any trial window.
  SELECT count(*) INTO v_active_paid
    FROM public.subscriptions
    WHERE status = 'active'
      AND (trial_end IS NULL OR trial_end <= v_now);

  -- Stripe-tracked trials.
  SELECT count(*) INTO v_trialing_stripe
    FROM public.subscriptions
    WHERE status = 'trialing'
       OR (status = 'active' AND trial_end IS NOT NULL AND trial_end > v_now);

  -- Implicit trial fallback: signups within the trial window with no paying or trialing sub row.
  -- This covers new users who haven't yet been provisioned in Stripe (e.g. Google OAuth signups).
  SELECT count(*) INTO v_trialing_implicit
    FROM public.profiles p
    WHERE p.created_at >= v_now - v_trial_window
      AND NOT EXISTS (
        SELECT 1 FROM public.subscriptions s
        WHERE s.user_id = p.id
          AND (s.status IN ('active','trialing','past_due'))
      );

  v_trialing := v_trialing_stripe + v_trialing_implicit;

  -- MRR
  SELECT
    COALESCE(SUM(
      CASE WHEN s.billing_interval = 'year' THEN pp.amount_eur / 12.0
           ELSE pp.amount_eur END
    ), 0),
    COUNT(*) FILTER (WHERE pp.amount_eur IS NULL)
  INTO v_mrr, v_mrr_unpriced
  FROM public.subscriptions s
  LEFT JOIN public.plan_prices pp
    ON pp.plan_key = lower(s.plan)
   AND pp.billing_interval = COALESCE(s.billing_interval, 'month')
  WHERE s.status = 'active'
    AND (s.trial_end IS NULL OR s.trial_end <= v_now);

  IF v_active_paid > 0 THEN
    v_arpu := v_mrr / v_active_paid;
  END IF;

  -- Churn
  SELECT count(*) INTO v_cancellations_30d
    FROM public.subscriptions
    WHERE status = 'canceled'
      AND updated_at >= v_30d_ago;

  v_active_at_period_start := v_active_paid + v_cancellations_30d;
  IF v_active_at_period_start > 0 THEN
    v_churn := (v_cancellations_30d::numeric / v_active_at_period_start::numeric) * 100;
  END IF;

  -- Trial → Paid conversion (Stripe cohort only — implicit trials have no outcome yet)
  SELECT count(*) INTO v_cohort_total
    FROM public.subscriptions
    WHERE trial_start IS NOT NULL
      AND trial_end IS NOT NULL
      AND trial_end <= v_now;

  SELECT count(*) INTO v_cohort_converted
    FROM public.subscriptions
    WHERE trial_start IS NOT NULL
      AND trial_end IS NOT NULL
      AND trial_end <= v_now
      AND status = 'active';

  IF v_cohort_total > 0 THEN
    v_conv := (v_cohort_converted::numeric / v_cohort_total::numeric) * 100;
  END IF;

  -- Engagement
  SELECT count(*) INTO v_open_tickets
    FROM public.support_tickets WHERE status = 'open';

  -- Menus: use user_weekly_menus (authoritative table for generated weekly plans).
  -- meal_plans is a legacy/unused table in this project.
  SELECT count(*), count(DISTINCT user_id)
    INTO v_total_menus, v_distinct_menu_users
    FROM public.user_weekly_menus;
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
      'cancellationsCount', v_cancellations_30d,
      'unpricedActiveSubs', v_mrr_unpriced
    ),
    'users', jsonb_build_object(
      'totalUsers', v_total_users,
      'activeSubscribers', v_active_paid,
      'trialUsers', v_trialing,
      'trialUsersStripe', v_trialing_stripe,
      'trialUsersImplicit', v_trialing_implicit,
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