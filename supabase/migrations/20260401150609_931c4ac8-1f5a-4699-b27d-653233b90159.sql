-- 1. PRIVILEGE_ESCALATION FIX: Remove user-facing UPDATE and INSERT on user_wallets
-- All wallet mutations must go through service_role RPCs (fn_consume_credit, rpc_apply_credit_transaction, etc.)
DROP POLICY IF EXISTS "Users can update own wallet" ON public.user_wallets;
DROP POLICY IF EXISTS "Users can insert own wallet" ON public.user_wallets;

-- 2. EXPOSED_SENSITIVE_DATA FIX: Add owner-only DELETE policy on profiles
CREATE POLICY "Users can delete own profile"
  ON public.profiles
  FOR DELETE
  TO authenticated
  USING (id = auth.uid());