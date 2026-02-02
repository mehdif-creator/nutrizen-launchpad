-- ============================================
-- KPI RPCs Part 2: Users, Subscribers, New Users, Tickets
-- ============================================

-- 5) Total Users Functions
CREATE OR REPLACE FUNCTION public.get_kpi_users_growth_timeseries(
  _from timestamptz DEFAULT NULL, _to timestamptz DEFAULT NULL, _granularity text DEFAULT 'day'
) RETURNS TABLE(bucket timestamptz, total_users int, new_users int)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT * INTO r FROM public.resolve_range(_from, _to);
  RETURN QUERY SELECT public.trunc_to_granularity(u.day::timestamptz, _granularity),
    MAX(u.total_users)::int, SUM(u.new_users)::int
  FROM public.kpi_users_daily_mv u WHERE u.day >= r.range_from::date AND u.day <= r.range_to::date
  GROUP BY 1 ORDER BY 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_kpi_users_active_timeseries(
  _from timestamptz DEFAULT NULL, _to timestamptz DEFAULT NULL, _granularity text DEFAULT 'day'
) RETURNS TABLE(bucket timestamptz, active_7d int, active_30d int)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT * INTO r FROM public.resolve_range(_from, _to);
  RETURN QUERY SELECT public.trunc_to_granularity(u.day::timestamptz, _granularity),
    MAX(u.active_users_7d)::int, MAX(u.active_users_30d)::int
  FROM public.kpi_users_daily_mv u WHERE u.day >= r.range_from::date AND u.day <= r.range_to::date
  GROUP BY 1 ORDER BY 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_kpi_users_breakdown(
  _from timestamptz DEFAULT NULL, _to timestamptz DEFAULT NULL, _dimension text DEFAULT 'country'
) RETURNS TABLE(dimension_value text, users int)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT * INTO r FROM public.resolve_range(_from, _to);
  IF _dimension = 'locale' OR _dimension = 'country' THEN
    RETURN QUERY SELECT COALESCE(p.locale, 'unknown'), COUNT(*)::int
    FROM public.profiles p WHERE p.created_at >= r.range_from AND p.created_at <= r.range_to
    GROUP BY 1 ORDER BY 2 DESC;
  ELSE
    RETURN QUERY SELECT 'unknown'::text, 0::int WHERE false;
  END IF;
END;
$$;

-- 6) Active Subscribers Functions
CREATE OR REPLACE FUNCTION public.get_kpi_subscribers_timeseries(
  _from timestamptz DEFAULT NULL, _to timestamptz DEFAULT NULL, _granularity text DEFAULT 'day'
) RETURNS TABLE(bucket timestamptz, active_subscribers int, new_subscribers int, cancelled_subscribers int)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT * INTO r FROM public.resolve_range(_from, _to);
  RETURN QUERY SELECT public.trunc_to_granularity(s.day::timestamptz, _granularity),
    SUM(s.active_subscribers)::int, SUM(s.new_subscribers)::int, SUM(s.cancelled_subscribers)::int
  FROM public.kpi_subscriptions_daily_mv s WHERE s.day >= r.range_from::date AND s.day <= r.range_to::date
  GROUP BY 1 ORDER BY 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_kpi_plan_mix_timeseries(
  _from timestamptz DEFAULT NULL, _to timestamptz DEFAULT NULL, _granularity text DEFAULT 'day'
) RETURNS TABLE(bucket timestamptz, plan text, active_subscribers int)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT * INTO r FROM public.resolve_range(_from, _to);
  RETURN QUERY SELECT public.trunc_to_granularity(s.day::timestamptz, _granularity), s.plan_name, SUM(s.active_subscribers)::int
  FROM public.kpi_subscriptions_daily_mv s WHERE s.day >= r.range_from::date AND s.day <= r.range_to::date
  GROUP BY 1, 2 ORDER BY 1, 2;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_kpi_subscription_changes(
  _from timestamptz DEFAULT NULL, _to timestamptz DEFAULT NULL, _granularity text DEFAULT 'day'
) RETURNS TABLE(bucket timestamptz, upgrades int, downgrades int)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'not authorized'; END IF;
  RETURN QUERY SELECT now(), 0::int, 0::int WHERE false;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_kpi_subscribers_breakdown(
  _from timestamptz DEFAULT NULL, _to timestamptz DEFAULT NULL, _dimension text DEFAULT 'plan'
) RETURNS TABLE(dimension_value text, active_subscribers int)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT * INTO r FROM public.resolve_range(_from, _to);
  IF _dimension = 'plan' THEN
    RETURN QUERY SELECT s.plan_name, SUM(s.active_subscribers)::int
    FROM public.kpi_subscriptions_daily_mv s WHERE s.day >= r.range_from::date AND s.day <= r.range_to::date
    GROUP BY 1 ORDER BY 2 DESC;
  ELSE
    RETURN QUERY SELECT 'unknown'::text, 0::int WHERE false;
  END IF;
END;
$$;

-- 7) New Users Functions
CREATE OR REPLACE FUNCTION public.get_kpi_new_users_timeseries(
  _from timestamptz DEFAULT NULL, _to timestamptz DEFAULT NULL, _granularity text DEFAULT 'day'
) RETURNS TABLE(bucket timestamptz, new_users int)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT * INTO r FROM public.resolve_range(_from, _to);
  RETURN QUERY SELECT public.trunc_to_granularity(p.created_at, _granularity), COUNT(*)::int
  FROM public.profiles p WHERE p.created_at >= r.range_from AND p.created_at <= r.range_to
  GROUP BY 1 ORDER BY 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_kpi_new_users_by_channel(_from timestamptz DEFAULT NULL, _to timestamptz DEFAULT NULL)
RETURNS TABLE(channel text, new_users int)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'not authorized'; END IF;
  RETURN QUERY SELECT 'organic'::text, 0::int WHERE false;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_kpi_activation_rate_timeseries(
  _from timestamptz DEFAULT NULL, _to timestamptz DEFAULT NULL, _granularity text DEFAULT 'day'
) RETURNS TABLE(bucket timestamptz, new_users int, activated int, activation_rate numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT * INTO r FROM public.resolve_range(_from, _to);
  RETURN QUERY
  WITH signups AS (
    SELECT public.trunc_to_granularity(p.created_at, _granularity) AS bucket, p.id AS user_id
    FROM public.profiles p WHERE p.created_at >= r.range_from AND p.created_at <= r.range_to
  ), activated_users AS (
    SELECT DISTINCT pr.user_id FROM public.preferences pr JOIN signups s ON pr.user_id = s.user_id
  )
  SELECT s.bucket, COUNT(DISTINCT s.user_id)::int, COUNT(DISTINCT a.user_id)::int,
    CASE WHEN COUNT(DISTINCT s.user_id) > 0 THEN (COUNT(DISTINCT a.user_id)::numeric / COUNT(DISTINCT s.user_id) * 100) ELSE 0 END
  FROM signups s LEFT JOIN activated_users a ON s.user_id = a.user_id GROUP BY 1 ORDER BY 1;
END;
$$;

-- 8) Tickets Functions (using existing support_tickets table)
CREATE OR REPLACE FUNCTION public.get_kpi_tickets_timeseries(
  _from timestamptz DEFAULT NULL, _to timestamptz DEFAULT NULL, _granularity text DEFAULT 'day'
) RETURNS TABLE(bucket timestamptz, open_tickets int, created_tickets int, resolved_tickets int)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT * INTO r FROM public.resolve_range(_from, _to);
  RETURN QUERY SELECT public.trunc_to_granularity(t.created_at, _granularity),
    COUNT(*) FILTER (WHERE t.status = 'open')::int, COUNT(*)::int, 0::int
  FROM public.support_tickets t WHERE t.created_at >= r.range_from AND t.created_at <= r.range_to
  GROUP BY 1 ORDER BY 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_kpi_tickets_by_category(_from timestamptz DEFAULT NULL, _to timestamptz DEFAULT NULL)
RETURNS TABLE(category text, tickets int)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT * INTO r FROM public.resolve_range(_from, _to);
  RETURN QUERY SELECT 'general'::text, COUNT(*)::int
  FROM public.support_tickets t WHERE t.created_at >= r.range_from AND t.created_at <= r.range_to;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_kpi_support_sla_stats(_from timestamptz DEFAULT NULL, _to timestamptz DEFAULT NULL)
RETURNS TABLE(avg_first_response_minutes numeric, avg_resolution_minutes numeric, sla_breaches int)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'not authorized'; END IF;
  RETURN QUERY SELECT 0::numeric, 0::numeric, 0::int;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_kpi_ticket_list(
  _from timestamptz DEFAULT NULL, _to timestamptz DEFAULT NULL, _limit int DEFAULT 50, _cursor text DEFAULT NULL,
  _status text DEFAULT NULL, _priority text DEFAULT NULL, _category text DEFAULT NULL
) RETURNS TABLE(ticket_id uuid, created_at timestamptz, status text, priority text, category text, subject text, cursor_out text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; _cursor_ts timestamptz; _cursor_id uuid;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT * INTO r FROM public.resolve_range(_from, _to);
  IF _cursor IS NOT NULL AND _cursor != '' THEN
    _cursor_ts := split_part(_cursor, '|', 1)::timestamptz;
    _cursor_id := split_part(_cursor, '|', 2)::uuid;
  END IF;
  RETURN QUERY SELECT t.id, t.created_at, t.status, 'medium'::text, 'general'::text, t.subject,
    (t.created_at::text || '|' || t.id::text)
  FROM public.support_tickets t
  WHERE t.created_at >= r.range_from AND t.created_at <= r.range_to
    AND (_status IS NULL OR t.status = _status)
    AND (_cursor IS NULL OR _cursor = '' OR (t.created_at, t.id) < (_cursor_ts, _cursor_id))
  ORDER BY t.created_at DESC, t.id DESC LIMIT _limit;
END;
$$;

-- Grants
GRANT EXECUTE ON FUNCTION public.get_kpi_users_growth_timeseries(timestamptz, timestamptz, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_kpi_users_active_timeseries(timestamptz, timestamptz, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_kpi_users_breakdown(timestamptz, timestamptz, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_kpi_subscribers_timeseries(timestamptz, timestamptz, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_kpi_plan_mix_timeseries(timestamptz, timestamptz, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_kpi_subscription_changes(timestamptz, timestamptz, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_kpi_subscribers_breakdown(timestamptz, timestamptz, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_kpi_new_users_timeseries(timestamptz, timestamptz, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_kpi_new_users_by_channel(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_kpi_activation_rate_timeseries(timestamptz, timestamptz, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_kpi_tickets_timeseries(timestamptz, timestamptz, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_kpi_tickets_by_category(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_kpi_support_sla_stats(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_kpi_ticket_list(timestamptz, timestamptz, int, text, text, text, text) TO authenticated;