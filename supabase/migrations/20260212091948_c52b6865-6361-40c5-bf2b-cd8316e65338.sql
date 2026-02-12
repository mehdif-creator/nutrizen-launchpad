
-- ============================================================
-- Quality Gate: Safety views, credit integrity, system alerts
-- ============================================================

-- 1) View: Menu safety violations
CREATE OR REPLACE VIEW public.v_menu_safety_violations AS
SELECT
  uwm.user_id,
  umi.recipe_id,
  r.title AS recipe_title,
  umi.meal_slot,
  umi.day_of_week,
  uwm.week_start,
  r.ingredient_keys AS recipe_ingredient_keys,
  p.allergies AS user_allergies,
  p.aliments_eviter AS user_avoid_foods
FROM public.user_weekly_menu_items umi
JOIN public.user_weekly_menus uwm ON uwm.id = umi.weekly_menu_id
JOIN public.recipes r ON r.id = umi.recipe_id
JOIN public.preferences p ON p.user_id = uwm.user_id
WHERE (
  (r.ingredient_keys IS NOT NULL AND p.allergies IS NOT NULL AND r.ingredient_keys && p.allergies)
  OR
  (r.ingredient_keys IS NOT NULL AND p.aliments_eviter IS NOT NULL AND r.ingredient_keys && p.aliments_eviter)
);

-- 2) RPC: Get safety violations
CREATE OR REPLACE FUNCTION public.get_safety_violations(p_limit integer DEFAULT 50)
RETURNS TABLE (
  user_id uuid, recipe_id uuid, recipe_title text, meal_slot text,
  day_of_week integer, week_start date, recipe_ingredient_keys text[],
  user_allergies text[], user_avoid_foods text[]
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT * FROM public.v_menu_safety_violations ORDER BY week_start DESC LIMIT p_limit;
$$;

-- 3) RPC: Credit consistency check
CREATE OR REPLACE FUNCTION public.check_credit_consistency()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE result jsonb; negative_count integer; duplicate_keys integer; wallet_ledger_mismatches integer;
BEGIN
  SELECT count(*) INTO negative_count FROM public.user_wallets WHERE subscription_credits < 0 OR lifetime_credits < 0;
  SELECT count(*) INTO duplicate_keys FROM (SELECT idempotency_key FROM public.credit_transactions WHERE idempotency_key IS NOT NULL GROUP BY idempotency_key HAVING count(*) > 1) dupes;
  SELECT count(*) INTO wallet_ledger_mismatches FROM (
    SELECT w.user_id FROM public.user_wallets w
    LEFT JOIN (SELECT user_id, sum(delta) AS ledger_total FROM public.credit_transactions GROUP BY user_id) l ON l.user_id = w.user_id
    WHERE abs((w.subscription_credits + w.lifetime_credits) - COALESCE(l.ledger_total, 0)) > 0.01
  ) m;
  result := jsonb_build_object('negative_balances', negative_count, 'duplicate_idempotency_keys', duplicate_keys, 'wallet_ledger_mismatches', wallet_ledger_mismatches, 'is_consistent', (negative_count = 0 AND duplicate_keys = 0 AND wallet_ledger_mismatches = 0));
  RETURN result;
END;
$$;

-- 4) RPC: Check stuck jobs
CREATE OR REPLACE FUNCTION public.check_stuck_jobs(p_minutes integer DEFAULT 15)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE result jsonb; stuck_menu integer; stuck_auto integer;
BEGIN
  SELECT count(*) INTO stuck_menu FROM public.menu_generation_jobs WHERE status = 'processing' AND created_at < now() - (p_minutes || ' minutes')::interval;
  SELECT count(*) INTO stuck_auto FROM public.automation_jobs WHERE status = 'running' AND created_at < now() - (p_minutes || ' minutes')::interval;
  result := jsonb_build_object('stuck_menu_jobs', stuck_menu, 'stuck_automation_jobs', stuck_auto, 'threshold_minutes', p_minutes, 'has_stuck_jobs', (stuck_menu > 0 OR stuck_auto > 0));
  RETURN result;
END;
$$;

-- 5) RPC: Images integrity check
CREATE OR REPLACE FUNCTION public.check_images_integrity()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE result jsonb; missing_url_count integer; sample_ids text[];
BEGIN
  SELECT count(*) INTO missing_url_count FROM public.recipes WHERE image_path IS NOT NULL AND (image_url IS NULL OR image_url = '') AND published = true;
  SELECT array_agg(id::text) INTO sample_ids FROM (SELECT id FROM public.recipes WHERE image_path IS NOT NULL AND (image_url IS NULL OR image_url = '') AND published = true LIMIT 10) sub;
  result := jsonb_build_object('missing_url_count', missing_url_count, 'sample_recipe_ids', COALESCE(sample_ids, ARRAY[]::text[]), 'is_clean', (missing_url_count = 0));
  RETURN result;
END;
$$;

-- 6) System alerts table
CREATE TABLE IF NOT EXISTS public.system_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL,
  severity text NOT NULL DEFAULT 'warn' CHECK (severity IN ('info', 'warn', 'error', 'critical')),
  message text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid
);
ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view system alerts" ON public.system_alerts FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert system alerts" ON public.system_alerts FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update system alerts" ON public.system_alerts FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 7) Health checks results table  
CREATE TABLE IF NOT EXISTS public.health_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  check_name text NOT NULL,
  status text NOT NULL CHECK (status IN ('pass', 'fail', 'warn')),
  message text,
  details jsonb DEFAULT '{}',
  run_at timestamptz NOT NULL DEFAULT now(),
  admin_user_id uuid
);
ALTER TABLE public.health_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view health checks" ON public.health_checks FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert health checks" ON public.health_checks FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 8) RPC: Get active system alerts
CREATE OR REPLACE FUNCTION public.get_active_alerts()
RETURNS SETOF public.system_alerts
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT * FROM public.system_alerts WHERE resolved_at IS NULL
  ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'error' THEN 1 WHEN 'warn' THEN 2 ELSE 3 END, created_at DESC
  LIMIT 50;
$$;

-- 9) Indexes
CREATE INDEX IF NOT EXISTS idx_system_alerts_unresolved ON public.system_alerts (created_at DESC) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_health_checks_run_at ON public.health_checks (run_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_idempotency ON public.credit_transactions (idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_menu_gen_jobs_stuck ON public.menu_generation_jobs (created_at) WHERE status = 'processing';
CREATE INDEX IF NOT EXISTS idx_automation_jobs_stuck ON public.automation_jobs (created_at) WHERE status = 'running';
