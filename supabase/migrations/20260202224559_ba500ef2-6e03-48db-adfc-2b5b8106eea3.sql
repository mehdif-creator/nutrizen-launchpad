-- ============================================
-- KPI RPCs Part 3: Menus, Ratings, Points + MV Security Fix
-- ============================================

-- Fix remaining MV security: use schema-level permission
ALTER MATERIALIZED VIEW public.recipe_macros_mv2 OWNER TO postgres;
ALTER MATERIALIZED VIEW public.kpi_subscriptions_daily_mv OWNER TO postgres;
ALTER MATERIALIZED VIEW public.kpi_events_daily_mv OWNER TO postgres;
ALTER MATERIALIZED VIEW public.kpi_users_daily_mv OWNER TO postgres;

-- 9) Menus Created Functions
CREATE OR REPLACE FUNCTION public.get_kpi_menus_created_timeseries(
  _from timestamptz DEFAULT NULL, _to timestamptz DEFAULT NULL, _granularity text DEFAULT 'day'
) RETURNS TABLE(bucket timestamptz, menus_created int)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT * INTO r FROM public.resolve_range(_from, _to);
  RETURN QUERY SELECT public.trunc_to_granularity(mp.created_at, _granularity), COUNT(*)::int
  FROM public.meal_plans mp WHERE mp.created_at >= r.range_from AND mp.created_at <= r.range_to
  GROUP BY 1 ORDER BY 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_kpi_menus_by_type(_from timestamptz DEFAULT NULL, _to timestamptz DEFAULT NULL)
RETURNS TABLE(meal_type text, menus int)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'not authorized'; END IF;
  RETURN QUERY SELECT 'weekly'::text, 0::int WHERE false;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_kpi_menus_breakdown(
  _from timestamptz DEFAULT NULL, _to timestamptz DEFAULT NULL, _dimension text DEFAULT 'country'
) RETURNS TABLE(dimension_value text, menus int)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT * INTO r FROM public.resolve_range(_from, _to);
  IF _dimension = 'locale' OR _dimension = 'country' THEN
    RETURN QUERY SELECT COALESCE(p.locale, 'unknown'), COUNT(mp.id)::int
    FROM public.meal_plans mp JOIN public.profiles p ON mp.user_id = p.id
    WHERE mp.created_at >= r.range_from AND mp.created_at <= r.range_to
    GROUP BY 1 ORDER BY 2 DESC;
  ELSE
    RETURN QUERY SELECT 'unknown'::text, 0::int WHERE false;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_kpi_top_menu_creators(
  _from timestamptz DEFAULT NULL, _to timestamptz DEFAULT NULL, _limit int DEFAULT 50, _cursor text DEFAULT NULL
) RETURNS TABLE(user_id uuid, menus int, last_menu_at timestamptz, cursor_out text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; _cursor_count int; _cursor_id uuid;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT * INTO r FROM public.resolve_range(_from, _to);
  IF _cursor IS NOT NULL AND _cursor != '' THEN
    _cursor_count := split_part(_cursor, '|', 1)::int;
    _cursor_id := split_part(_cursor, '|', 2)::uuid;
  END IF;
  RETURN QUERY SELECT mp.user_id, COUNT(*)::int, MAX(mp.created_at), (COUNT(*)::text || '|' || mp.user_id::text)
  FROM public.meal_plans mp WHERE mp.created_at >= r.range_from AND mp.created_at <= r.range_to
  GROUP BY mp.user_id
  HAVING (_cursor IS NULL OR _cursor = '' OR (COUNT(*)::int, mp.user_id) < (_cursor_count, _cursor_id))
  ORDER BY 2 DESC, 1 DESC LIMIT _limit;
END;
$$;

-- 10) Menus per User Functions
CREATE OR REPLACE FUNCTION public.get_kpi_menus_per_user_timeseries(
  _from timestamptz DEFAULT NULL, _to timestamptz DEFAULT NULL, _granularity text DEFAULT 'day'
) RETURNS TABLE(bucket timestamptz, avg_menus_per_user numeric, median_menus_per_user numeric, p90_menus_per_user numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT * INTO r FROM public.resolve_range(_from, _to);
  RETURN QUERY WITH user_menus AS (
    SELECT public.trunc_to_granularity(mp.created_at, _granularity) AS bucket, mp.user_id, COUNT(*) AS menu_count
    FROM public.meal_plans mp WHERE mp.created_at >= r.range_from AND mp.created_at <= r.range_to
    GROUP BY 1, 2
  )
  SELECT um.bucket, AVG(um.menu_count)::numeric,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY um.menu_count)::numeric,
    PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY um.menu_count)::numeric
  FROM user_menus um GROUP BY 1 ORDER BY 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_kpi_menus_per_user_distribution(_from timestamptz DEFAULT NULL, _to timestamptz DEFAULT NULL)
RETURNS TABLE(bucket text, users int)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT * INTO r FROM public.resolve_range(_from, _to);
  RETURN QUERY WITH user_counts AS (
    SELECT mp.user_id, COUNT(*) AS cnt
    FROM public.meal_plans mp WHERE mp.created_at >= r.range_from AND mp.created_at <= r.range_to
    GROUP BY 1
  )
  SELECT CASE WHEN cnt = 0 THEN '0' WHEN cnt = 1 THEN '1' WHEN cnt BETWEEN 2 AND 3 THEN '2-3' WHEN cnt BETWEEN 4 AND 7 THEN '4-7' ELSE '8+' END,
    COUNT(*)::int FROM user_counts
  GROUP BY 1 ORDER BY CASE CASE WHEN cnt = 0 THEN '0' WHEN cnt = 1 THEN '1' WHEN cnt BETWEEN 2 AND 3 THEN '2-3' WHEN cnt BETWEEN 4 AND 7 THEN '4-7' ELSE '8+' END
    WHEN '0' THEN 1 WHEN '1' THEN 2 WHEN '2-3' THEN 3 WHEN '4-7' THEN 4 ELSE 5 END;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_kpi_menus_per_user_by_cohort(_from timestamptz DEFAULT NULL, _to timestamptz DEFAULT NULL)
RETURNS TABLE(cohort_month date, avg_menus_per_user numeric, users int)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT * INTO r FROM public.resolve_range(_from, _to);
  RETURN QUERY WITH user_cohorts AS (
    SELECT p.id AS user_id, date_trunc('month', p.created_at)::date AS cohort_month
    FROM public.profiles p WHERE p.created_at >= r.range_from AND p.created_at <= r.range_to
  ), user_menus AS (
    SELECT uc.cohort_month, uc.user_id, COUNT(mp.id) AS menu_count
    FROM user_cohorts uc LEFT JOIN public.meal_plans mp ON uc.user_id = mp.user_id AND mp.created_at >= r.range_from AND mp.created_at <= r.range_to
    GROUP BY 1, 2
  )
  SELECT um.cohort_month, AVG(um.menu_count)::numeric, COUNT(DISTINCT um.user_id)::int
  FROM user_menus um GROUP BY 1 ORDER BY 1;
END;
$$;

-- 11) Ratings Functions
CREATE OR REPLACE FUNCTION public.get_kpi_ratings_timeseries(
  _from timestamptz DEFAULT NULL, _to timestamptz DEFAULT NULL, _granularity text DEFAULT 'day'
) RETURNS TABLE(bucket timestamptz, avg_rating numeric, ratings_count int)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT * INTO r FROM public.resolve_range(_from, _to);
  RETURN QUERY SELECT public.trunc_to_granularity(mr.created_at, _granularity), AVG(mr.stars)::numeric, COUNT(*)::int
  FROM public.meal_ratings mr WHERE mr.created_at >= r.range_from AND mr.created_at <= r.range_to AND mr.stars IS NOT NULL
  GROUP BY 1 ORDER BY 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_kpi_ratings_distribution(_from timestamptz DEFAULT NULL, _to timestamptz DEFAULT NULL)
RETURNS TABLE(stars int, count int)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT * INTO r FROM public.resolve_range(_from, _to);
  RETURN QUERY SELECT mr.stars, COUNT(*)::int
  FROM public.meal_ratings mr WHERE mr.created_at >= r.range_from AND mr.created_at <= r.range_to AND mr.stars IS NOT NULL
  GROUP BY 1 ORDER BY 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_kpi_recipe_ratings_table(
  _from timestamptz DEFAULT NULL, _to timestamptz DEFAULT NULL, _min_count int DEFAULT 5,
  _limit int DEFAULT 50, _cursor text DEFAULT NULL, _sort text DEFAULT 'avg_desc'
) RETURNS TABLE(recipe_id uuid, avg_rating numeric, ratings_count int, cursor_out text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; _cursor_val numeric; _cursor_id uuid;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT * INTO r FROM public.resolve_range(_from, _to);
  IF _cursor IS NOT NULL AND _cursor != '' THEN
    _cursor_val := split_part(_cursor, '|', 1)::numeric;
    _cursor_id := split_part(_cursor, '|', 2)::uuid;
  END IF;
  RETURN QUERY SELECT mp.id, AVG(mr.stars)::numeric, COUNT(mr.id)::int, (AVG(mr.stars)::text || '|' || mp.id::text)
  FROM public.meal_plans mp JOIN public.meal_ratings mr ON mp.id = mr.meal_plan_id
  WHERE mp.created_at >= r.range_from AND mp.created_at <= r.range_to AND mr.stars IS NOT NULL
  GROUP BY mp.id HAVING COUNT(mr.id) >= _min_count
    AND (_cursor IS NULL OR _cursor = '' OR (AVG(mr.stars), mp.id) < (_cursor_val, _cursor_id))
  ORDER BY CASE WHEN _sort = 'avg_desc' THEN AVG(mr.stars) END DESC NULLS LAST,
    CASE WHEN _sort = 'count_desc' THEN COUNT(mr.id) END DESC, mp.id DESC
  LIMIT _limit;
END;
$$;

-- 12) Points Total (Gamification) Functions
CREATE OR REPLACE FUNCTION public.get_kpi_points_timeseries(
  _from timestamptz DEFAULT NULL, _to timestamptz DEFAULT NULL, _granularity text DEFAULT 'day'
) RETURNS TABLE(bucket timestamptz, points numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT * INTO r FROM public.resolve_range(_from, _to);
  RETURN QUERY SELECT public.trunc_to_granularity(ge.created_at, _granularity), SUM(ge.xp_delta)::numeric
  FROM public.gamification_events ge WHERE ge.created_at >= r.range_from AND ge.created_at <= r.range_to
  GROUP BY 1 ORDER BY 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_kpi_points_by_event_type(_from timestamptz DEFAULT NULL, _to timestamptz DEFAULT NULL)
RETURNS TABLE(event_type text, points numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT * INTO r FROM public.resolve_range(_from, _to);
  RETURN QUERY SELECT ge.event_type, SUM(ge.xp_delta)::numeric
  FROM public.gamification_events ge WHERE ge.created_at >= r.range_from AND ge.created_at <= r.range_to
  GROUP BY 1 ORDER BY 2 DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_kpi_points_breakdown(
  _from timestamptz DEFAULT NULL, _to timestamptz DEFAULT NULL, _dimension text DEFAULT 'country'
) RETURNS TABLE(dimension_value text, points numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT * INTO r FROM public.resolve_range(_from, _to);
  IF _dimension = 'locale' OR _dimension = 'country' THEN
    RETURN QUERY SELECT COALESCE(p.locale, 'unknown'), SUM(ge.xp_delta)::numeric
    FROM public.gamification_events ge JOIN public.profiles p ON ge.user_id = p.id
    WHERE ge.created_at >= r.range_from AND ge.created_at <= r.range_to
    GROUP BY 1 ORDER BY 2 DESC;
  ELSIF _dimension = 'event_type' THEN
    RETURN QUERY SELECT ge.event_type, SUM(ge.xp_delta)::numeric
    FROM public.gamification_events ge WHERE ge.created_at >= r.range_from AND ge.created_at <= r.range_to
    GROUP BY 1 ORDER BY 2 DESC;
  ELSE
    RETURN QUERY SELECT 'unknown'::text, 0::numeric WHERE false;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_kpi_points_leaderboard(
  _from timestamptz DEFAULT NULL, _to timestamptz DEFAULT NULL, _limit int DEFAULT 50, _cursor text DEFAULT NULL
) RETURNS TABLE(user_id uuid, points numeric, last_event_at timestamptz, cursor_out text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; _cursor_points numeric; _cursor_id uuid;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT * INTO r FROM public.resolve_range(_from, _to);
  IF _cursor IS NOT NULL AND _cursor != '' THEN
    _cursor_points := split_part(_cursor, '|', 1)::numeric;
    _cursor_id := split_part(_cursor, '|', 2)::uuid;
  END IF;
  RETURN QUERY SELECT ge.user_id, SUM(ge.xp_delta)::numeric, MAX(ge.created_at), (SUM(ge.xp_delta)::text || '|' || ge.user_id::text)
  FROM public.gamification_events ge WHERE ge.created_at >= r.range_from AND ge.created_at <= r.range_to
  GROUP BY ge.user_id
  HAVING (_cursor IS NULL OR _cursor = '' OR (SUM(ge.xp_delta), ge.user_id) < (_cursor_points, _cursor_id))
  ORDER BY 2 DESC, 1 DESC LIMIT _limit;
END;
$$;

-- Grants
GRANT EXECUTE ON FUNCTION public.get_kpi_menus_created_timeseries(timestamptz, timestamptz, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_kpi_menus_by_type(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_kpi_menus_breakdown(timestamptz, timestamptz, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_kpi_top_menu_creators(timestamptz, timestamptz, int, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_kpi_menus_per_user_timeseries(timestamptz, timestamptz, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_kpi_menus_per_user_distribution(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_kpi_menus_per_user_by_cohort(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_kpi_ratings_timeseries(timestamptz, timestamptz, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_kpi_ratings_distribution(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_kpi_recipe_ratings_table(timestamptz, timestamptz, int, int, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_kpi_points_timeseries(timestamptz, timestamptz, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_kpi_points_by_event_type(timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_kpi_points_breakdown(timestamptz, timestamptz, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_kpi_points_leaderboard(timestamptz, timestamptz, int, text) TO authenticated;