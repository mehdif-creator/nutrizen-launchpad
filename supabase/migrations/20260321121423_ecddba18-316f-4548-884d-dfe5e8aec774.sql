
-- ═══════════════════════════════════════════════════════════════
-- 1. Bootstrap status tracking table
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.user_bootstrap_status (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_created boolean NOT NULL DEFAULT false,
  wallet_created boolean NOT NULL DEFAULT false,
  stats_created boolean NOT NULL DEFAULT false,
  points_created boolean NOT NULL DEFAULT false,
  gamification_created boolean NOT NULL DEFAULT false,
  preferences_created boolean NOT NULL DEFAULT false,
  bootstrap_completed boolean NOT NULL DEFAULT false,
  bootstrap_version integer NOT NULL DEFAULT 1,
  last_error text,
  last_error_step text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_bootstrap_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own bootstrap status"
  ON public.user_bootstrap_status FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- 2. Repair/reconcile RPC — idempotent, safe on retry
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.repair_user_bootstrap(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fixed text[] := '{}';
  v_errors text[] := '{}';
  v_status record;
BEGIN
  -- Only allow users to repair their own account
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;

  -- 1. Ensure profile exists
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id) THEN
    BEGIN
      INSERT INTO profiles (id, updated_at)
      VALUES (p_user_id, now())
      ON CONFLICT (id) DO NOTHING;
      v_fixed := array_append(v_fixed, 'profile');
    EXCEPTION WHEN OTHERS THEN
      v_errors := array_append(v_errors, 'profile: ' || SQLERRM);
    END;
  END IF;

  -- 2. Ensure wallet exists
  IF NOT EXISTS (SELECT 1 FROM user_wallets WHERE user_id = p_user_id) THEN
    BEGIN
      INSERT INTO user_wallets (user_id, subscription_credits, lifetime_credits)
      VALUES (p_user_id, 0, 0)
      ON CONFLICT (user_id) DO NOTHING;
      v_fixed := array_append(v_fixed, 'wallet');
    EXCEPTION WHEN OTHERS THEN
      v_errors := array_append(v_errors, 'wallet: ' || SQLERRM);
    END;
  END IF;

  -- 3. Ensure dashboard stats
  IF NOT EXISTS (SELECT 1 FROM user_dashboard_stats WHERE user_id = p_user_id) THEN
    BEGIN
      INSERT INTO user_dashboard_stats (user_id)
      VALUES (p_user_id)
      ON CONFLICT (user_id) DO NOTHING;
      v_fixed := array_append(v_fixed, 'dashboard_stats');
    EXCEPTION WHEN OTHERS THEN
      v_errors := array_append(v_errors, 'dashboard_stats: ' || SQLERRM);
    END;
  END IF;

  -- 4. Ensure gamification state
  IF NOT EXISTS (SELECT 1 FROM user_gamification_state WHERE user_id = p_user_id) THEN
    BEGIN
      INSERT INTO user_gamification_state (user_id, total_points, level, streak_days)
      VALUES (p_user_id, 0, 1, 0)
      ON CONFLICT (user_id) DO NOTHING;
      v_fixed := array_append(v_fixed, 'gamification_state');
    EXCEPTION WHEN OTHERS THEN
      v_errors := array_append(v_errors, 'gamification_state: ' || SQLERRM);
    END;
  END IF;

  -- 5. Ensure preferences
  IF NOT EXISTS (SELECT 1 FROM preferences WHERE user_id = p_user_id) THEN
    BEGIN
      INSERT INTO preferences (user_id)
      VALUES (p_user_id)
      ON CONFLICT (user_id) DO NOTHING;
      v_fixed := array_append(v_fixed, 'preferences');
    EXCEPTION WHEN OTHERS THEN
      v_errors := array_append(v_errors, 'preferences: ' || SQLERRM);
    END;
  END IF;

  -- 6. Ensure user_points
  IF NOT EXISTS (SELECT 1 FROM user_points WHERE user_id = p_user_id) THEN
    BEGIN
      INSERT INTO user_points (user_id, points)
      VALUES (p_user_id, 0)
      ON CONFLICT (user_id) DO NOTHING;
      v_fixed := array_append(v_fixed, 'user_points');
    EXCEPTION WHEN OTHERS THEN
      v_errors := array_append(v_errors, 'user_points: ' || SQLERRM);
    END;
  END IF;

  -- 7. Update bootstrap status
  INSERT INTO user_bootstrap_status (
    user_id, profile_created, wallet_created, stats_created,
    points_created, gamification_created, preferences_created,
    bootstrap_completed, last_error, last_error_step, updated_at
  ) VALUES (
    p_user_id,
    EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id),
    EXISTS (SELECT 1 FROM user_wallets WHERE user_id = p_user_id),
    EXISTS (SELECT 1 FROM user_dashboard_stats WHERE user_id = p_user_id),
    EXISTS (SELECT 1 FROM user_points WHERE user_id = p_user_id),
    EXISTS (SELECT 1 FROM user_gamification_state WHERE user_id = p_user_id),
    EXISTS (SELECT 1 FROM preferences WHERE user_id = p_user_id),
    (array_length(v_errors, 1) IS NULL OR array_length(v_errors, 1) = 0),
    CASE WHEN array_length(v_errors, 1) > 0 THEN array_to_string(v_errors, '; ') ELSE NULL END,
    CASE WHEN array_length(v_errors, 1) > 0 THEN v_errors[1] ELSE NULL END,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    profile_created = EXCLUDED.profile_created,
    wallet_created = EXCLUDED.wallet_created,
    stats_created = EXCLUDED.stats_created,
    points_created = EXCLUDED.points_created,
    gamification_created = EXCLUDED.gamification_created,
    preferences_created = EXCLUDED.preferences_created,
    bootstrap_completed = EXCLUDED.bootstrap_completed,
    last_error = EXCLUDED.last_error,
    last_error_step = EXCLUDED.last_error_step,
    updated_at = now();

  RETURN jsonb_build_object(
    'success', true,
    'fixed', to_jsonb(v_fixed),
    'errors', to_jsonb(v_errors),
    'bootstrap_complete', (array_length(v_errors, 1) IS NULL OR array_length(v_errors, 1) = 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.repair_user_bootstrap(uuid) TO authenticated;

-- ═══════════════════════════════════════════════════════════════
-- 3. Quick health check RPC (lightweight, no repair)
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.check_user_bootstrap_health(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile boolean;
  v_wallet boolean;
  v_stats boolean;
  v_prefs boolean;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;

  v_profile := EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id);
  v_wallet := EXISTS (SELECT 1 FROM user_wallets WHERE user_id = p_user_id);
  v_stats := EXISTS (SELECT 1 FROM user_dashboard_stats WHERE user_id = p_user_id);
  v_prefs := EXISTS (SELECT 1 FROM preferences WHERE user_id = p_user_id);

  RETURN jsonb_build_object(
    'healthy', (v_profile AND v_wallet AND v_stats AND v_prefs),
    'profile', v_profile,
    'wallet', v_wallet,
    'stats', v_stats,
    'preferences', v_prefs
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_user_bootstrap_health(uuid) TO authenticated;
