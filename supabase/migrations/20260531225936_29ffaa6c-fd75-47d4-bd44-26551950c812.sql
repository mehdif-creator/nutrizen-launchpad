
-- 1. Subscriptions: remove user INSERT/UPDATE. Service role + admin policies remain.
DROP POLICY IF EXISTS "Users can insert own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update own subscription" ON public.subscriptions;

-- 2. Profiles: prevent privilege escalation via plan_tier / is_affiliate / affiliate_code.
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Service role and admins can change anything
  IF auth.role() = 'service_role' OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.plan_tier IS DISTINCT FROM OLD.plan_tier THEN
    RAISE EXCEPTION 'Not allowed to modify plan_tier' USING ERRCODE = '42501';
  END IF;
  IF NEW.is_affiliate IS DISTINCT FROM OLD.is_affiliate THEN
    RAISE EXCEPTION 'Not allowed to modify is_affiliate' USING ERRCODE = '42501';
  END IF;
  IF NEW.affiliate_code IS DISTINCT FROM OLD.affiliate_code THEN
    RAISE EXCEPTION 'Not allowed to modify affiliate_code' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_privilege_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_profile_privilege_escalation
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- 3. Realtime: add per-user channel scoping for streaks, badges, daily recipes.
DROP POLICY IF EXISTS "Authenticated users can receive own realtime updates" ON realtime.messages;
CREATE POLICY "Authenticated users can receive own realtime updates"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() = ANY (ARRAY[
    ('weekly_recipes_changes_'::text || (auth.uid())::text),
    ('user-wallet-'::text || (auth.uid())::text),
    ('credits_changes_'::text || (auth.uid())::text),
    ('user_weekly_menus_changes_'::text || (auth.uid())::text),
    ('dashboard-'::text || (auth.uid())::text),
    ('user-menu-'::text || (auth.uid())::text),
    ('user-stats-'::text || (auth.uid())::text),
    ('user-gamification-'::text || (auth.uid())::text),
    ('gam-state-'::text || (auth.uid())::text),
    ('user-events-'::text || (auth.uid())::text),
    ('user-streaks-'::text || (auth.uid())::text),
    ('user-badges-'::text || (auth.uid())::text),
    ('user-daily-recipes-'::text || (auth.uid())::text)
  ])
);
