# NutriZen Security Notes

## Materialized View Warnings (Accepted/Ignored)

The Supabase linter may report warnings about materialized views being accessible via the API. These warnings have been reviewed and are **accepted/ignored** for the following reasons:

### recipe_macros_mv and recipe_macros_mv2

- **Status**: Accepted risk / False positive
- **Reason**: These materialized views contain pre-computed recipe nutrition data (macros) derived from publicly readable recipe data. The views:
  1. Do not contain any sensitive user data
  2. Contain the same data that is already accessible via the `recipes` table
  3. Are read-only by design
  4. Have had direct access revoked from `anon` and `authenticated` roles via migration
- **Action taken**: SELECT permissions revoked for `anon` and `authenticated` roles. Only `service_role` can access directly.
- **No further action required**

### KPI Materialized Views (kpi_*_daily_mv)

- **Status**: Secured
- **Reason**: These views contain aggregated analytics data for admin dashboards.
- **Action taken**: 
  1. SELECT permissions revoked for `anon` and `authenticated` roles
  2. Only `service_role` can access directly
  3. All access is through admin-gated RPC functions that verify admin role
- **No further action required**

## Function Search Path

All database functions with `SECURITY DEFINER` have been secured with `SET search_path = public` to prevent search path manipulation attacks. This was addressed in migrations:

- `20251023132420`: Converted ciqual_full view to SECURITY INVOKER
- `20251023191315`: Added fixed search_path to all SECURITY DEFINER functions
- Latest migrations: Fixed remaining functions (`get_weekly_recipes_by_day`, `rpc_apply_credit_reset`, `compute_recipe_macros`, `process_recipe_macros_queue`)

## Security Audit Checklist

- [x] All SECURITY DEFINER functions have fixed search_path
- [x] Materialized views protected from direct API access
- [x] Admin functions verify role server-side
- [x] RLS enabled on all user-facing tables
- [x] Service role key never exposed to client
- [x] Edge functions validate JWT tokens

Last reviewed: 2026-02-02
