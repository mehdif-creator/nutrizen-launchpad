-- Security Hardening: Fix search_path and protect materialized views
-- =====================================================================

-- 1. Fix functions with pg_temp in search_path (security risk)
-- Using ALTER FUNCTION to only change the SET clause, not recreate the function

ALTER FUNCTION public.get_weekly_recipes_by_day(uuid, date) SET search_path = public;
ALTER FUNCTION public.rpc_apply_credit_reset(uuid) SET search_path = public;

-- 2. Protect materialized views from direct API access
-- Revoke SELECT from anon and authenticated roles on all MVs

REVOKE SELECT ON public.recipe_macros_mv FROM anon, authenticated;
REVOKE SELECT ON public.recipe_macros_mv2 FROM anon, authenticated;
REVOKE SELECT ON public.kpi_subscriptions_daily_mv FROM anon, authenticated;
REVOKE SELECT ON public.kpi_events_daily_mv FROM anon, authenticated;
REVOKE SELECT ON public.kpi_users_daily_mv FROM anon, authenticated;

-- Grant access only to service_role for backend operations
GRANT SELECT ON public.recipe_macros_mv TO service_role;
GRANT SELECT ON public.recipe_macros_mv2 TO service_role;
GRANT SELECT ON public.kpi_subscriptions_daily_mv TO service_role;
GRANT SELECT ON public.kpi_events_daily_mv TO service_role;
GRANT SELECT ON public.kpi_users_daily_mv TO service_role;

-- 3. Add comments explaining security measures
COMMENT ON MATERIALIZED VIEW public.recipe_macros_mv IS 'Pre-computed recipe macros. Access via RPC functions only, not direct API.';
COMMENT ON MATERIALIZED VIEW public.recipe_macros_mv2 IS 'Pre-computed recipe macros v2. Access via RPC functions only, not direct API.';
COMMENT ON MATERIALIZED VIEW public.kpi_subscriptions_daily_mv IS 'KPI analytics data. Admin access only via RPC functions.';
COMMENT ON MATERIALIZED VIEW public.kpi_events_daily_mv IS 'KPI events analytics. Admin access only via RPC functions.';
COMMENT ON MATERIALIZED VIEW public.kpi_users_daily_mv IS 'KPI users analytics. Admin access only via RPC functions.';