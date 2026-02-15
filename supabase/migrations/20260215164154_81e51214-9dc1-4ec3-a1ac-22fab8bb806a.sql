
-- Fix 1: Drop both old and new wallet policies, recreate clean
DROP POLICY IF EXISTS "System can manage wallets" ON public.user_wallets;
DROP POLICY IF EXISTS "Service role can manage wallets" ON public.user_wallets;
CREATE POLICY "Service role can manage wallets"
  ON public.user_wallets FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Fix 2: Drop old audit log policy, recreate for service_role only
DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.admin_audit_log;
CREATE POLICY "Service role can insert audit logs"
  ON public.admin_audit_log FOR INSERT
  TO service_role
  WITH CHECK (true);
