-- ============================================
-- Fix MV API access & create KPI RPCs Part 1
-- ============================================

-- Revoke public access to MVs (security fix)
REVOKE SELECT ON public.kpi_subscriptions_daily_mv FROM anon, authenticated;
REVOKE SELECT ON public.kpi_events_daily_mv FROM anon, authenticated;
REVOKE SELECT ON public.kpi_users_daily_mv FROM anon, authenticated;

-- 1) MRR Functions
CREATE OR REPLACE FUNCTION public.get_kpi_mrr_timeseries(
  _from timestamptz DEFAULT NULL, _to timestamptz DEFAULT NULL,
  _granularity text DEFAULT 'day', _plan text DEFAULT NULL, _country text DEFAULT NULL
) RETURNS TABLE(bucket timestamptz, mrr numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT * INTO r FROM public.resolve_range(_from, _to);
  RETURN QUERY SELECT public.trunc_to_granularity(s.day::timestamptz, _granularity), SUM(s.revenue_mrr)::numeric
  FROM public.kpi_subscriptions_daily_mv s
  WHERE s.day >= r.range_from::date AND s.day <= r.range_to::date
    AND (_plan IS NULL OR s.plan_name = _plan) AND (_country IS NULL OR s.country = _country)
  GROUP BY 1 ORDER BY 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_kpi_mrr_movements(
  _from timestamptz DEFAULT NULL, _to timestamptz DEFAULT NULL, _granularity text DEFAULT 'day'
) RETURNS TABLE(bucket timestamptz, new_mrr numeric, expansion_mrr numeric, contraction_mrr numeric, churned_mrr numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT * INTO r FROM public.resolve_range(_from, _to);
  RETURN QUERY SELECT public.trunc_to_granularity(s.day::timestamptz, _granularity),
    SUM(s.revenue_mrr)::numeric, 0::numeric, 0::numeric, 0::numeric
  FROM public.kpi_subscriptions_daily_mv s
  WHERE s.day >= r.range_from::date AND s.day <= r.range_to::date
  GROUP BY 1 ORDER BY 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_kpi_mrr_by_plan(_from timestamptz DEFAULT NULL, _to timestamptz DEFAULT NULL)
RETURNS TABLE(plan text, mrr numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT * INTO r FROM public.resolve_range(_from, _to);
  RETURN QUERY SELECT s.plan_name, SUM(s.revenue_mrr)::numeric
  FROM public.kpi_subscriptions_daily_mv s
  WHERE s.day >= r.range_from::date AND s.day <= r.range_to::date
  GROUP BY 1 ORDER BY 2 DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_kpi_mrr_top_customers(
  _from timestamptz DEFAULT NULL, _to timestamptz DEFAULT NULL, _limit int DEFAULT 50, _cursor text DEFAULT NULL
) RETURNS TABLE(customer_id uuid, mrr numeric, last_payment timestamptz, cursor_out text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; _cursor_mrr numeric; _cursor_id uuid;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT * INTO r FROM public.resolve_range(_from, _to);
  IF _cursor IS NOT NULL AND _cursor != '' THEN
    _cursor_mrr := split_part(_cursor, '|', 1)::numeric;
    _cursor_id := split_part(_cursor, '|', 2)::uuid;
  END IF;
  RETURN QUERY SELECT p.id, 0::numeric, p.created_at, ('0|' || p.id::text)
  FROM public.profiles p
  WHERE p.created_at >= r.range_from AND p.created_at <= r.range_to
    AND (_cursor IS NULL OR _cursor = '' OR (0, p.id) < (_cursor_mrr, _cursor_id))
  ORDER BY 2 DESC, 1 DESC LIMIT _limit;
END;
$$;

-- 2) ARPU Functions
CREATE OR REPLACE FUNCTION public.get_kpi_arpu_timeseries(
  _from timestamptz DEFAULT NULL, _to timestamptz DEFAULT NULL,
  _granularity text DEFAULT 'day', _plan text DEFAULT NULL, _country text DEFAULT NULL
) RETURNS TABLE(bucket timestamptz, arpu numeric, active_users int, revenue numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT * INTO r FROM public.resolve_range(_from, _to);
  RETURN QUERY SELECT public.trunc_to_granularity(u.day::timestamptz, _granularity),
    CASE WHEN SUM(u.total_users) > 0 THEN (SUM(COALESCE(s.revenue_mrr, 0)) / SUM(u.total_users))::numeric ELSE 0 END,
    SUM(u.total_users)::int, SUM(COALESCE(s.revenue_mrr, 0))::numeric
  FROM public.kpi_users_daily_mv u
  LEFT JOIN public.kpi_subscriptions_daily_mv s ON u.day = s.day
  WHERE u.day >= r.range_from::date AND u.day <= r.range_to::date
  GROUP BY 1 ORDER BY 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_kpi_arpu_by_plan(_from timestamptz DEFAULT NULL, _to timestamptz DEFAULT NULL)
RETURNS TABLE(plan text, arpu numeric, users int, revenue numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT * INTO r FROM public.resolve_range(_from, _to);
  RETURN QUERY SELECT s.plan_name, CASE WHEN SUM(s.active_subscribers) > 0 THEN (SUM(s.revenue_mrr) / SUM(s.active_subscribers))::numeric ELSE 0 END,
    SUM(s.active_subscribers)::int, SUM(s.revenue_mrr)::numeric
  FROM public.kpi_subscriptions_daily_mv s
  WHERE s.day >= r.range_from::date AND s.day <= r.range_to::date
  GROUP BY 1 ORDER BY 2 DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_kpi_arpu_by_cohort(_from timestamptz DEFAULT NULL, _to timestamptz DEFAULT NULL)
RETURNS TABLE(cohort_month date, arpu numeric, users int)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT * INTO r FROM public.resolve_range(_from, _to);
  RETURN QUERY SELECT date_trunc('month', p.created_at)::date, 0::numeric, COUNT(*)::int
  FROM public.profiles p WHERE p.created_at >= r.range_from AND p.created_at <= r.range_to
  GROUP BY 1 ORDER BY 1;
END;
$$;

-- 3) Conversion Functions
CREATE OR REPLACE FUNCTION public.get_kpi_conversion_timeseries(
  _from timestamptz DEFAULT NULL, _to timestamptz DEFAULT NULL, _granularity text DEFAULT 'day'
) RETURNS TABLE(bucket timestamptz, trials int, paid int, conversion_rate numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT * INTO r FROM public.resolve_range(_from, _to);
  RETURN QUERY SELECT public.trunc_to_granularity(u.day::timestamptz, _granularity),
    SUM(u.trial_users)::int, SUM(u.paid_users)::int,
    CASE WHEN SUM(u.trial_users) > 0 THEN (SUM(u.paid_users)::numeric / SUM(u.trial_users) * 100) ELSE 0 END
  FROM public.kpi_users_daily_mv u WHERE u.day >= r.range_from::date AND u.day <= r.range_to::date
  GROUP BY 1 ORDER BY 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_kpi_conversion_funnel(_from timestamptz DEFAULT NULL, _to timestamptz DEFAULT NULL)
RETURNS TABLE(step text, users int)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; total_signups int; onboarded int; first_menu int; converted int;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT * INTO r FROM public.resolve_range(_from, _to);
  SELECT COUNT(*) INTO total_signups FROM public.profiles WHERE created_at >= r.range_from AND created_at <= r.range_to;
  SELECT COUNT(DISTINCT p.user_id) INTO onboarded FROM public.preferences p
    JOIN public.profiles pr ON p.user_id = pr.id WHERE pr.created_at >= r.range_from AND pr.created_at <= r.range_to;
  SELECT COUNT(DISTINCT mp.user_id) INTO first_menu FROM public.meal_plans mp
    JOIN public.profiles pr ON mp.user_id = pr.id WHERE pr.created_at >= r.range_from AND pr.created_at <= r.range_to;
  converted := 0;
  RETURN QUERY SELECT 'signup'::text, total_signups UNION ALL SELECT 'onboarding_complete'::text, onboarded
    UNION ALL SELECT 'first_menu_generated'::text, first_menu UNION ALL SELECT 'paid'::text, converted;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_kpi_time_to_convert_distribution(_from timestamptz DEFAULT NULL, _to timestamptz DEFAULT NULL)
RETURNS TABLE(days_bucket int, users int)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'not authorized'; END IF;
  RETURN QUERY SELECT 0::int, 0::int WHERE false;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_kpi_conversion_breakdown(_from timestamptz DEFAULT NULL, _to timestamptz DEFAULT NULL, _dimension text DEFAULT 'country')
RETURNS TABLE(dimension_value text, trials int, paid int, conversion_rate numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'not authorized'; END IF;
  RETURN QUERY SELECT 'unknown'::text, 0::int, 0::int, 0::numeric WHERE false;
END;
$$;

-- 4) Churn Functions
CREATE OR REPLACE FUNCTION public.get_kpi_churn_timeseries(
  _from timestamptz DEFAULT NULL, _to timestamptz DEFAULT NULL, _granularity text DEFAULT 'day'
) RETURNS TABLE(bucket timestamptz, churn_rate numeric, cancels int)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT * INTO r FROM public.resolve_range(_from, _to);
  RETURN QUERY SELECT public.trunc_to_granularity(s.day::timestamptz, _granularity),
    CASE WHEN SUM(s.active_subscribers) > 0 THEN (SUM(s.churned_subscribers)::numeric / SUM(s.active_subscribers) * 100) ELSE 0 END,
    SUM(s.cancelled_subscribers)::int
  FROM public.kpi_subscriptions_daily_mv s WHERE s.day >= r.range_from::date AND s.day <= r.range_to::date
  GROUP BY 1 ORDER BY 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_kpi_churn_by_plan(_from timestamptz DEFAULT NULL, _to timestamptz DEFAULT NULL)
RETURNS TABLE(plan text, churn_rate numeric, cancels int)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT * INTO r FROM public.resolve_range(_from, _to);
  RETURN QUERY SELECT s.plan_name, CASE WHEN SUM(s.active_subscribers) > 0 THEN (SUM(s.churned_subscribers)::numeric / SUM(s.active_subscribers) * 100) ELSE 0 END,
    SUM(s.cancelled_subscribers)::int
  FROM public.kpi_subscriptions_daily_mv s WHERE s.day >= r.range_from::date AND s.day <= r.range_to::date
  GROUP BY 1 ORDER BY 2 DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_kpi_retention_cohorts(_from timestamptz DEFAULT NULL, _to timestamptz DEFAULT NULL)
RETURNS TABLE(cohort_month date, month_n int, retained_rate numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'not authorized'; END IF;
  RETURN QUERY SELECT CURRENT_DATE, 0::int, 0::numeric WHERE false;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_kpi_churn_breakdown(_from timestamptz DEFAULT NULL, _to timestamptz DEFAULT NULL, _dimension text DEFAULT 'country')
RETURNS TABLE(dimension_value text, cancels int, churn_rate numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'not authorized'; END IF;
  RETURN QUERY SELECT 'unknown'::text, 0::int, 0::numeric WHERE false;
END;
$$;

-- Grants for Part 1
GRANT EXECUTE ON FUNCTION public.get_kpi_mrr_timeseries(timestamptz, timestamptz, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_kpi_mrr_movements(timestamptz, timestamptz, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_kpi_mrr_by_plan(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_kpi_mrr_top_customers(timestamptz, timestamptz, int, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_kpi_arpu_timeseries(timestamptz, timestamptz, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_kpi_arpu_by_plan(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_kpi_arpu_by_cohort(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_kpi_conversion_timeseries(timestamptz, timestamptz, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_kpi_conversion_funnel(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_kpi_time_to_convert_distribution(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_kpi_conversion_breakdown(timestamptz, timestamptz, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_kpi_churn_timeseries(timestamptz, timestamptz, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_kpi_churn_by_plan(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_kpi_retention_cohorts(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_kpi_churn_breakdown(timestamptz, timestamptz, text) TO authenticated;