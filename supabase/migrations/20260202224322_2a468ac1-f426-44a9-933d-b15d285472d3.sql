-- ============================================
-- NutriZen Admin KPI RPCs - Foundation & MVs
-- ============================================

-- A) Foundation helpers
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.normalize_granularity(_g text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE 
    WHEN lower(_g) IN ('week', 'weekly', 'w') THEN 'week'
    WHEN lower(_g) IN ('month', 'monthly', 'm') THEN 'month'
    ELSE 'day'
  END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_range(
  _from timestamptz,
  _to timestamptz,
  OUT range_from timestamptz,
  OUT range_to timestamptz
)
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT 
    COALESCE(_from, now() - interval '30 days'),
    COALESCE(_to, now());
$$;

CREATE OR REPLACE FUNCTION public.trunc_to_granularity(_ts timestamptz, _granularity text)
RETURNS timestamptz
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE public.normalize_granularity(_granularity)
    WHEN 'week' THEN date_trunc('week', _ts)
    WHEN 'month' THEN date_trunc('month', _ts)
    ELSE date_trunc('day', _ts)
  END;
$$;

-- B) Materialized Views
DROP MATERIALIZED VIEW IF EXISTS public.kpi_subscriptions_daily_mv CASCADE;
CREATE MATERIALIZED VIEW public.kpi_subscriptions_daily_mv AS
SELECT 
  date_trunc('day', now())::date AS day,
  'free'::text AS plan_name,
  'FR'::text AS country,
  0::int AS active_subscribers,
  0::int AS new_subscribers,
  0::int AS cancelled_subscribers,
  0::int AS churned_subscribers,
  0::numeric AS revenue_mrr
WHERE false;

CREATE UNIQUE INDEX idx_kpi_subscriptions_daily_mv_unique ON public.kpi_subscriptions_daily_mv(day, plan_name, country);

DROP MATERIALIZED VIEW IF EXISTS public.kpi_events_daily_mv CASCADE;
CREATE MATERIALIZED VIEW public.kpi_events_daily_mv AS
SELECT 
  date_trunc('day', ge.created_at)::date AS day,
  ge.event_type AS metric,
  SUM(ge.xp_delta)::numeric AS value,
  NULL::text AS country,
  NULL::text AS device
FROM public.gamification_events ge
GROUP BY 1, 2
UNION ALL
SELECT 
  date_trunc('day', mp.created_at)::date AS day,
  'menus_created'::text AS metric,
  COUNT(*)::numeric AS value,
  NULL::text AS country,
  NULL::text AS device
FROM public.meal_plans mp
GROUP BY 1
UNION ALL
SELECT 
  date_trunc('day', mr.created_at)::date AS day,
  'ratings_count'::text AS metric,
  COUNT(*)::numeric AS value,
  NULL::text AS country,
  NULL::text AS device
FROM public.meal_ratings mr
GROUP BY 1;

CREATE INDEX idx_kpi_events_daily_mv_day_metric ON public.kpi_events_daily_mv(day, metric);

DROP MATERIALIZED VIEW IF EXISTS public.kpi_users_daily_mv CASCADE;
CREATE MATERIALIZED VIEW public.kpi_users_daily_mv AS
WITH date_series AS (
  SELECT generate_series(
    COALESCE((SELECT MIN(created_at)::date FROM public.profiles), CURRENT_DATE - 365),
    CURRENT_DATE,
    '1 day'::interval
  )::date AS day
)
SELECT 
  d.day,
  (SELECT COUNT(*) FROM public.profiles WHERE created_at::date <= d.day)::int AS total_users,
  (SELECT COUNT(*) FROM public.profiles WHERE created_at::date = d.day)::int AS new_users,
  0::int AS active_users_7d,
  0::int AS active_users_30d,
  0::int AS paid_users,
  0::int AS trial_users
FROM date_series d;

CREATE UNIQUE INDEX idx_kpi_users_daily_mv_day ON public.kpi_users_daily_mv(day);

-- MV Refresh functions
CREATE OR REPLACE FUNCTION public.refresh_kpi_subscriptions_daily_mv()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'not authorized'; END IF;
  REFRESH MATERIALIZED VIEW public.kpi_subscriptions_daily_mv;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_kpi_events_daily_mv()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'not authorized'; END IF;
  REFRESH MATERIALIZED VIEW public.kpi_events_daily_mv;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_kpi_users_daily_mv()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'not authorized'; END IF;
  REFRESH MATERIALIZED VIEW public.kpi_users_daily_mv;
END;
$$;

-- C) Performance Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles(created_at);
CREATE INDEX IF NOT EXISTS idx_profiles_locale ON public.profiles(locale);
CREATE INDEX IF NOT EXISTS idx_meal_plans_user_id ON public.meal_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_created_at ON public.meal_plans(created_at);
CREATE INDEX IF NOT EXISTS idx_meal_ratings_created_at ON public.meal_ratings(created_at);
CREATE INDEX IF NOT EXISTS idx_meal_ratings_stars ON public.meal_ratings(stars);
CREATE INDEX IF NOT EXISTS idx_gamification_events_created_at ON public.gamification_events(created_at);
CREATE INDEX IF NOT EXISTS idx_gamification_events_user_id ON public.gamification_events(user_id);
CREATE INDEX IF NOT EXISTS idx_gamification_events_event_type ON public.gamification_events(event_type);
CREATE INDEX IF NOT EXISTS idx_preferences_user_id ON public.preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON public.support_tickets(created_at);

-- Grants
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.normalize_granularity(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_range(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.trunc_to_granularity(timestamptz, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_kpi_subscriptions_daily_mv() TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_kpi_events_daily_mv() TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_kpi_users_daily_mv() TO authenticated;