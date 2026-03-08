
-- ============================================================
-- 1. Enable realtime on missing tables
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_streaks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_badges;

-- ============================================================
-- 2. Add missing enum values to gamification_event for new event types
-- ============================================================
DO $$ BEGIN
  ALTER TYPE public.gamification_event ADD VALUE IF NOT EXISTS 'MENU_GENERATED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE public.gamification_event ADD VALUE IF NOT EXISTS 'GROCERY_LIST';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE public.gamification_event ADD VALUE IF NOT EXISTS 'SHARE_WEEK';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE public.gamification_event ADD VALUE IF NOT EXISTS 'WEEK_COMPLETED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE public.gamification_event ADD VALUE IF NOT EXISTS 'REFERRAL_JOINED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 3. Sync existing data from user_wallets into user_gamification_state
-- ============================================================
INSERT INTO user_gamification_state (user_id, total_points, level, streak_days, last_activity_date, updated_at)
SELECT 
  w.user_id,
  GREATEST(w.lifetime_points, COALESCE(gs.total_points, 0)),
  COALESCE(gs.level, 1),
  COALESCE(s.current_streak_days, COALESCE(gs.streak_days, 0)),
  COALESCE(s.last_active_date, gs.last_activity_date),
  now()
FROM user_wallets w
LEFT JOIN user_gamification_state gs ON gs.user_id = w.user_id
LEFT JOIN user_streaks s ON s.user_id = w.user_id
WHERE w.lifetime_points > 0
ON CONFLICT (user_id) DO UPDATE SET
  total_points = GREATEST(EXCLUDED.total_points, user_gamification_state.total_points),
  streak_days = GREATEST(EXCLUDED.streak_days, user_gamification_state.streak_days),
  last_activity_date = COALESCE(EXCLUDED.last_activity_date, user_gamification_state.last_activity_date),
  updated_at = now();

-- Recalculate levels for all synced rows
UPDATE user_gamification_state ugs
SET level = COALESCE(
  (SELECT gl.level FROM gamification_levels gl WHERE gl.min_points <= ugs.total_points ORDER BY gl.level DESC LIMIT 1),
  1
);

-- ============================================================
-- 4. Update fn_emit_gamification_event to sync all systems
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_emit_gamification_event(
  p_event_type text,
  p_meta jsonb DEFAULT '{}'::jsonb,
  p_idempotency_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  -- Look up points rule
  SELECT gpr.points, gpr.max_per_day, gpr.active, gpr.label_fr
  INTO v_points, v_max_per_day, v_active, v_label
  FROM gamification_point_rules gpr
  WHERE gpr.event_type = p_event_type;

  IF v_points IS NULL OR NOT v_active THEN
    RETURN jsonb_build_object('success', false, 'error', 'unknown_or_inactive_event');
  END IF;

  -- Idempotency check
  IF p_idempotency_key IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM gamification_events ge
      WHERE ge.idempotency_key = p_idempotency_key
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'already_processed', 'duplicate', true);
    END IF;
  END IF;

  v_today := (now() AT TIME ZONE 'Europe/Paris')::date;
  
  -- Daily limit check
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

  -- Insert gamification event
  INSERT INTO gamification_events (user_id, event_type, xp_delta, metadata, idempotency_key)
  VALUES (v_user_id, p_event_type, v_points, p_meta, p_idempotency_key);

  -- Get current streak state with row lock
  SELECT ugs.last_activity_date, ugs.streak_days
  INTO v_last_date, v_new_streak
  FROM user_gamification_state ugs
  WHERE ugs.user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    v_new_streak := 1;
  ELSE
    IF v_last_date = v_today THEN
      NULL; -- Same day, keep streak
    ELSIF v_last_date = v_today - 1 THEN
      v_new_streak := COALESCE(v_new_streak, 0) + 1;
    ELSE
      v_new_streak := 1;
    END IF;
  END IF;

  -- Upsert gamification state (primary source of truth)
  INSERT INTO user_gamification_state (user_id, total_points, level, streak_days, last_activity_date, updated_at)
  VALUES (v_user_id, v_points, 1, v_new_streak, v_today, now())
  ON CONFLICT (user_id) DO UPDATE SET
    total_points = user_gamification_state.total_points + v_points,
    streak_days = v_new_streak,
    last_activity_date = v_today,
    updated_at = now();

  -- Get new total
  SELECT ugs.total_points INTO v_new_total
  FROM user_gamification_state ugs
  WHERE ugs.user_id = v_user_id;

  -- Calculate level
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

  -- ── SYNC to user_wallets (dashboard wallet) ──
  INSERT INTO user_wallets (user_id, points_total, lifetime_points)
  VALUES (v_user_id, v_points, v_points)
  ON CONFLICT (user_id) DO UPDATE SET
    points_total = user_wallets.points_total + v_points,
    lifetime_points = user_wallets.lifetime_points + v_points,
    updated_at = now();

  -- ── SYNC to user_events (dashboard activity feed) ──
  -- Only insert if the event type exists in the enum
  BEGIN
    INSERT INTO user_events (user_id, event_type, points_delta, credits_delta, meta)
    VALUES (v_user_id, p_event_type::gamification_event, v_points, 0, p_meta);
  EXCEPTION WHEN invalid_text_representation THEN
    -- Event type not in enum, skip user_events insert
    NULL;
  END;

  -- ── SYNC to user_streaks (dashboard streak widget) ──
  INSERT INTO user_streaks (user_id, current_streak_days, longest_streak_days, last_active_date)
  VALUES (v_user_id, v_new_streak, v_new_streak, v_today)
  ON CONFLICT (user_id) DO UPDATE SET
    current_streak_days = v_new_streak,
    longest_streak_days = GREATEST(user_streaks.longest_streak_days, v_new_streak),
    last_active_date = v_today,
    updated_at = now();

  -- ── Badge checks ──
  IF v_new_streak >= 30 THEN
    INSERT INTO user_badges (user_id, badge_code)
    VALUES (v_user_id, 'DISCIPLINE_GOLD')
    ON CONFLICT DO NOTHING;
  END IF;

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

-- ============================================================
-- 5. Create leaderboard view
-- ============================================================
CREATE OR REPLACE VIEW public.gamification_leaderboard AS
SELECT 
  ugs.user_id,
  p.display_name,
  p.avatar_url,
  ugs.total_points,
  ugs.level,
  ugs.streak_days,
  ROW_NUMBER() OVER (ORDER BY ugs.total_points DESC, ugs.updated_at ASC) AS rank
FROM user_gamification_state ugs
JOIN profiles p ON p.id = ugs.user_id
WHERE p.show_on_leaderboard = true
  AND ugs.total_points > 0;

-- ============================================================
-- 6. Add missing point rules
-- ============================================================
INSERT INTO gamification_point_rules (event_type, points, label_fr, max_per_day, active)
VALUES ('WEEKLY_CHALLENGE_COMPLETED', 15, 'Défi hebdo complété', 1, true)
ON CONFLICT (event_type) DO NOTHING;

INSERT INTO gamification_point_rules (event_type, points, label_fr, max_per_day, active)
VALUES ('SOCIAL_SHARE', 5, 'Partage social', 3, true)
ON CONFLICT (event_type) DO NOTHING;

INSERT INTO gamification_point_rules (event_type, points, label_fr, max_per_day, active)
VALUES ('STREAK_MILESTONE', 10, 'Jalon de série', null, true)
ON CONFLICT (event_type) DO NOTHING;
