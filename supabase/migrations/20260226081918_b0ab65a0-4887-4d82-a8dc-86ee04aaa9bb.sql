
-- Fix 1: Make the view SECURITY INVOKER (safe since we only granted SELECT to authenticated)
DROP VIEW IF EXISTS public.pinterest_oauth_status;

CREATE VIEW public.pinterest_oauth_status
WITH (security_invoker = true)
AS
SELECT
  account_label,
  scope,
  expires_at,
  updated_at,
  CASE WHEN access_token_enc IS NOT NULL OR access_token IS NOT NULL THEN true ELSE false END AS has_access_token,
  CASE WHEN refresh_token_enc IS NOT NULL OR refresh_token IS NOT NULL THEN true ELSE false END AS has_refresh_token
FROM public.pinterest_oauth;

GRANT SELECT ON public.pinterest_oauth_status TO authenticated;

-- Fix 2: Drop the overly permissive policy and replace with a role-check policy
DROP POLICY IF EXISTS "service_role_full_access" ON public.pinterest_oauth;

-- Since we already revoked all privileges from anon and authenticated,
-- RLS policies only matter for service_role. But to satisfy the linter,
-- use a restrictive policy that only service_role can match.
-- service_role bypasses RLS by default, so we just need a deny-all policy
-- for any other role that somehow gets access.
CREATE POLICY "deny_all_non_service"
  ON public.pinterest_oauth
  FOR ALL
  USING (false)
  WITH CHECK (false);
