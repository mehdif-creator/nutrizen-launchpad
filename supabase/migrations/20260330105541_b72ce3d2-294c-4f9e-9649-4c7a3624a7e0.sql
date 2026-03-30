
-- ==========================================================
-- SECURITY FIX 1: Remove sensitive tables from Realtime
-- ==========================================================

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'profiles', 'subscriptions', 'credit_transactions',
    'user_wallets', 'user_dashboard_stats', 'user_points',
    'user_gamification', 'user_gamification_state',
    'user_events', 'support_tickets'
  ]
  LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime DROP TABLE public.%I', t);
    EXCEPTION WHEN undefined_object THEN
      NULL;
    END;
  END LOOP;
END $$;

-- ==========================================================
-- SECURITY FIX 2: Fix user_roles privilege escalation
-- ==========================================================

DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

CREATE POLICY "Admins can insert roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update roles"
ON public.user_roles FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- ==========================================================
-- SECURITY FIX 3: Document deny-all backup table
-- ==========================================================

COMMENT ON TABLE public.manual_social_posts_backup_20260328
  IS 'Historical backup — RLS enabled with no policies (deny-all by design)';
