
-- 1. Pricing source of truth
CREATE TABLE IF NOT EXISTS public.plan_prices (
  plan_key         text NOT NULL,
  billing_interval text NOT NULL CHECK (billing_interval IN ('month','year')),
  amount_eur       numeric(10,2) NOT NULL CHECK (amount_eur >= 0),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (plan_key, billing_interval)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_prices TO authenticated;
GRANT ALL ON public.plan_prices TO service_role;

ALTER TABLE public.plan_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read plan_prices" ON public.plan_prices;
CREATE POLICY "Admins read plan_prices"
ON public.plan_prices FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins write plan_prices" ON public.plan_prices;
CREATE POLICY "Admins write plan_prices"
ON public.plan_prices FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Seed current plans (idempotent). Yearly stored as the full annual amount, normalized at query time.
INSERT INTO public.plan_prices (plan_key, billing_interval, amount_eur) VALUES
  ('starter','month',12.99),
  ('starter','year',124.70),  -- 12.99 * 12 * 0.8
  ('premium','month',19.99),
  ('premium','year',191.90)   -- 19.99 * 12 * 0.8
ON CONFLICT (plan_key, billing_interval) DO NOTHING;

-- 2. Corrected RPC
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

  v_total_users int;
  v_new_month int;
  v_new_week int;

  -- Subscription buckets
  v_active_paid int;       -- status='active' AND not in trial
  v_trialing int;          -- status='trialing' OR (status='active' AND trial_end > now)

  -- MRR
  v_mrr numeric := 0;
  v_arpu numeric := 0;
  v_mrr_unpriced int := 0; -- active subs with no matching plan_prices row

  -- Churn
  v_cancellations_30d int;
  v_active_at_period_start int;
  v_churn numeric := 0;

  -- Conversion (cohort: trials whose trial_end has passed)
  v_cohort_total int;
  v_cohort_converted int;
  v_conv numeric := 0;

  -- Engagement
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

  -- Users
  SELECT count(*) INTO v_total_users FROM public.profiles;
  SELECT count(*) INTO v_new_month FROM public.profiles WHERE created_at >= v_month_start;
  SELECT count(*) INTO v_new_week FROM public.profiles WHERE created_at >= v_week_start;

  -- Paying = Stripe status 'active' AND past any trial window
  SELECT count(*) INTO v_active_paid
    FROM public.subscriptions
    WHERE status = 'active'
      AND (trial_end IS NULL OR trial_end <= v_now);

  -- Trialing = Stripe status 'trialing', plus any 'active' still inside trial_end
  SELECT count(*) INTO v_trialing
    FROM public.subscriptions
    WHERE status = 'trialing'
       OR (status = 'active' AND trial_end IS NOT NULL AND trial_end > v_now);

  -- MRR: join active paid subs against plan_prices, normalize yearly to monthly.
  -- Pricing comes from the plan_prices table, never hardcoded here.
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

  -- Churn (30 days, approximated):
  -- cancellations_30d / active_paid_at_period_start
  -- We approximate "active paid at start of period" as
  --   current active paid + cancellations within the window.
  -- This is an over-approximation if new paying subs were added during the window
  -- and an under-approximation if many subs both started and churned inside it.
  -- Documented limitation: no per-day subscription snapshot exists; revisit when
  -- a billing-history table is available.
  SELECT count(*) INTO v_cancellations_30d
    FROM public.subscriptions
    WHERE status = 'canceled'
      AND updated_at >= v_30d_ago;

  v_active_at_period_start := v_active_paid + v_cancellations_30d;
  IF v_active_at_period_start > 0 THEN
    v_churn := (v_cancellations_30d::numeric / v_active_at_period_start::numeric) * 100;
  END IF;

  -- Trial → Paid conversion (cohort with time to convert):
  -- Denominator: subscriptions whose trial period has fully ended (had time to convert).
  -- Numerator: subset that are now status='active' AND past their trial_end.
  -- Subs still trialing are excluded (no result yet).
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
      'cancellationsCount', v_cancellations_30d,
      'unpricedActiveSubs', v_mrr_unpriced
    ),
    'users', jsonb_build_object(
      'totalUsers', v_total_users,
      'activeSubscribers', v_active_paid,
      'trialUsers', v_trialing,
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
