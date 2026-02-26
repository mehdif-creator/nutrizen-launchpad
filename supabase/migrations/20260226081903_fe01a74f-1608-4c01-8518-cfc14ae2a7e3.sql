
-- 1. Enable RLS on pinterest_oauth table
ALTER TABLE public.pinterest_oauth ENABLE ROW LEVEL SECURITY;

-- 2. Revoke direct access from anon and authenticated roles
REVOKE ALL ON public.pinterest_oauth FROM anon, authenticated;

-- 3. Only service_role can perform all operations (used by edge functions)
CREATE POLICY "service_role_full_access"
  ON public.pinterest_oauth
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Note: This policy only applies to service_role since we revoked
-- all permissions from anon and authenticated above.
-- Edge functions use service_role key, so they retain full access.

-- 4. Allow admins to read non-sensitive metadata only via a secure view
CREATE OR REPLACE VIEW public.pinterest_oauth_status AS
SELECT
  account_label,
  scope,
  expires_at,
  updated_at,
  CASE WHEN access_token_enc IS NOT NULL OR access_token IS NOT NULL THEN true ELSE false END AS has_access_token,
  CASE WHEN refresh_token_enc IS NOT NULL OR refresh_token IS NOT NULL THEN true ELSE false END AS has_refresh_token
FROM public.pinterest_oauth;

-- 5. Revoke direct access to the view from non-service roles, then grant to authenticated
GRANT SELECT ON public.pinterest_oauth_status TO authenticated;
