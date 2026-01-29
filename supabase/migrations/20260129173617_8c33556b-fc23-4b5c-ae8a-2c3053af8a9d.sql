-- Fix overly permissive RLS policies flagged by Supabase linter
-- Goal: remove INSERT/ALL policies that effectively allow writes with `WITH CHECK (true)` or `USING (true)`
-- and restrict them to the exact internal roles that need them.

BEGIN;

-- 1) admin_audit_log: INSERT policy was incorrectly granted to authenticated with WITH CHECK (true)
DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.admin_audit_log;
CREATE POLICY "Service role can insert audit logs"
ON public.admin_audit_log
FOR INSERT
TO service_role
WITH CHECK (current_user = 'service_role');

-- 2) processed_checkout_sessions: make service-role policy explicit (avoid USING/WITH CHECK true)
DROP POLICY IF EXISTS "Service role can manage processed sessions" ON public.processed_checkout_sessions;
CREATE POLICY "Service role can manage processed sessions"
ON public.processed_checkout_sessions
FOR ALL
TO service_role
USING (current_user = 'service_role')
WITH CHECK (current_user = 'service_role');

-- 3) user_dashboard_stats: INSERT policy was TO public with WITH CHECK (true)
-- Needed for internal auth trigger flows; restrict to supabase_auth_admin only.
DROP POLICY IF EXISTS "Allow inserts from triggers" ON public.user_dashboard_stats;
CREATE POLICY "Auth system can insert dashboard stats"
ON public.user_dashboard_stats
FOR INSERT
TO supabase_auth_admin
WITH CHECK (current_user = 'supabase_auth_admin');

-- 4) user_gamification: INSERT policy was TO public with WITH CHECK (true)
DROP POLICY IF EXISTS "Allow inserts from triggers" ON public.user_gamification;
CREATE POLICY "Auth system can insert gamification"
ON public.user_gamification
FOR INSERT
TO supabase_auth_admin
WITH CHECK (current_user = 'supabase_auth_admin');

-- 5) user_points: INSERT policy was TO public with WITH CHECK (true)
DROP POLICY IF EXISTS "Allow inserts from triggers" ON public.user_points;
CREATE POLICY "Auth system can insert user points"
ON public.user_points
FOR INSERT
TO supabase_auth_admin
WITH CHECK (current_user = 'supabase_auth_admin');

-- 6) user_weekly_menu_items: make service-role override explicit (avoid USING/WITH CHECK true)
DROP POLICY IF EXISTS "Service role can manage all menu items" ON public.user_weekly_menu_items;
CREATE POLICY "Service role can manage all menu items"
ON public.user_weekly_menu_items
FOR ALL
TO service_role
USING (current_user = 'service_role')
WITH CHECK (current_user = 'service_role');

-- 7) recipes: remove public read-all policy (keeps published-only public read)
DROP POLICY IF EXISTS "recipes_read_all" ON public.recipes;

COMMIT;