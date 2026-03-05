-- =============================================
-- GAMIFICATION V2: Clean deterministic model
-- =============================================

-- 1) Point rules table (configurable)
CREATE TABLE IF NOT EXISTS public.gamification_point_rules (
  event_type text PRIMARY KEY,
  points integer NOT NULL DEFAULT 0,
  label_fr text NOT NULL DEFAULT '',
  max_per_day integer,
  active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.gamification_point_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read point rules"
  ON public.gamification_point_rules FOR SELECT
  TO authenticated, anon
  USING (true);

-- Seed default rules
INSERT INTO public.gamification_point_rules (event_type, points, label_fr, max_per_day) VALUES
  ('APP_OPEN', 2, 'Ouverture de l''app', 1),
  ('MEAL_VALIDATED', 3, 'Repas validé', 10),
  ('DAY_COMPLETED', 5, 'Journée complète', 1),
  ('WEEK_COMPLETED', 20, 'Semaine complète', 1),
  ('SHARE_WEEK', 5, 'Semaine partagée', 1),
  ('REFERRAL_JOINED', 50, 'Parrainage réussi', NULL),
  ('BADGE_GRANTED', 10, 'Badge débloqué', NULL),
  ('MENU_GENERATED', 5, 'Menu généré', 3),
  ('GROCERY_LIST', 3, 'Liste de courses générée', 1)
ON CONFLICT (event_type) DO NOTHING;

-- 2) User gamification state (single row per user)
CREATE TABLE IF NOT EXISTS public.user_gamification_state (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_points integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  streak_days integer NOT NULL DEFAULT 0,
  last_activity_date date,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_gamification_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own gamification state"
  ON public.user_gamification_state FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can manage gamification state"
  ON public.user_gamification_state FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_gamification_state;

-- 3) Level thresholds
CREATE TABLE IF NOT EXISTS public.gamification_levels (
  level integer PRIMARY KEY,
  min_points integer NOT NULL,
  name_fr text NOT NULL
);

ALTER TABLE public.gamification_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read levels"
  ON public.gamification_levels FOR SELECT
  TO authenticated, anon
  USING (true);

INSERT INTO public.gamification_levels (level, min_points, name_fr) VALUES
  (1, 0, 'Débutant'),
  (2, 100, 'Apprenti'),
  (3, 250, 'Cuisinier'),
  (4, 450, 'Chef'),
  (5, 700, 'Chef Étoilé'),
  (6, 1000, 'Grand Chef'),
  (7, 1400, 'Chef Exécutif'),
  (8, 1900, 'Maître Cuisinier'),
  (9, 2500, 'Légende'),
  (10, 3200, 'Maître Zen')
ON CONFLICT (level) DO NOTHING;

-- 4) Atomic RPC: emit event + update state
CREATE OR REPLACE FUNCTION public.fn_emit_gamification_event(
  p_event_type text,
  p_meta jsonb DEFAULT '{}'::jsonb,
  p_idempotency_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_points integer;
  v_max_per_day integer;
  v_active boolean;
  v_label text;
  v_today date;
  v_count_today integer;
  v_new_total integer;
  v_new_level integer;
  v_new_streak integer;
  v_last_date date;
  v_level_name text;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  SELECT gpr.points, gpr.max_per_day, gpr.active, gpr.label_fr
  INTO v_points, v_max_per_day, v_active, v_label
  FROM gamification_point_rules gpr
  WHERE gpr.event_type = p_event_type;

  IF v_points IS NULL OR NOT v_active THEN
    RETURN jsonb_build_object('success', false, 'error', 'unknown_or_inactive_event');
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM gamification_events ge
      WHERE ge.idempotency_key = p_idempotency_key
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'already_processed', 'duplicate', true);
    END IF;
  END IF;

  v_today := (now() AT TIME ZONE 'Europe/Paris')::date;
  
  IF v_max_per_day IS NOT NULL THEN
    SELECT count(*)
    INTO v_count_today
    FROM gamification_events ge
    WHERE ge.user_id = v_user_id
      AND ge.event_type = p_event_type
      AND (ge.created_at AT TIME ZONE 'Europe/Paris')::date = v_today;

    IF v_count_today >= v_max_per_day THEN
      RETURN jsonb_build_object('success', false, 'error', 'daily_limit_reached');
    END IF;
  END IF;

  INSERT INTO gamification_events (user_id, event_type, xp_delta, metadata, idempotency_key)
  VALUES (v_user_id, p_event_type, v_points, p_meta, p_idempotency_key);

  SELECT ugs.last_activity_date, ugs.streak_days
  INTO v_last_date, v_new_streak
  FROM user_gamification_state ugs
  WHERE ugs.user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    v_new_streak := 1;
  ELSE
    IF v_last_date = v_today THEN
      NULL;
    ELSIF v_last_date = v_today - 1 THEN
      v_new_streak := COALESCE(v_new_streak, 0) + 1;
    ELSE
      v_new_streak := 1;
    END IF;
  END IF;

  INSERT INTO user_gamification_state (user_id, total_points, level, streak_days, last_activity_date, updated_at)
  VALUES (v_user_id, v_points, 1, v_new_streak, v_today, now())
  ON CONFLICT (user_id) DO UPDATE SET
    total_points = user_gamification_state.total_points + v_points,
    streak_days = v_new_streak,
    last_activity_date = v_today,
    updated_at = now();

  SELECT ugs.total_points INTO v_new_total
  FROM user_gamification_state ugs
  WHERE ugs.user_id = v_user_id;

  SELECT gl.level, gl.name_fr
  INTO v_new_level, v_level_name
  FROM gamification_levels gl
  WHERE gl.min_points <= v_new_total
  ORDER BY gl.level DESC
  LIMIT 1;

  v_new_level := COALESCE(v_new_level, 1);

  UPDATE user_gamification_state
  SET level = v_new_level
  WHERE user_id = v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'points_awarded', v_points,
    'total_points', v_new_total,
    'level', v_new_level,
    'level_name', COALESCE(v_level_name, 'Débutant'),
    'streak_days', v_new_streak,
    'label', v_label
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_emit_gamification_event(text, jsonb, text) TO authenticated;

-- 5) Indexes
CREATE INDEX IF NOT EXISTS idx_gam_events_user_type_date
  ON public.gamification_events (user_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_gam_events_idempotency
  ON public.gamification_events (idempotency_key) WHERE idempotency_key IS NOT NULL;