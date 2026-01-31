-- =============================================================
-- GAMIFICATION SYSTEM: XP, Levels, Streaks, and Idempotent Events
-- =============================================================

-- Create or update user_gamification table (if not exists or add columns)
CREATE TABLE IF NOT EXISTS public.gamification_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  xp_delta integer NOT NULL DEFAULT 0,
  idempotency_key text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Add unique constraint for idempotency
ALTER TABLE public.gamification_events 
ADD CONSTRAINT gamification_events_user_idempotency_unique 
UNIQUE (user_id, idempotency_key);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_gamification_events_user_created 
ON public.gamification_events(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.gamification_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for gamification_events
CREATE POLICY "Users can view own gamification events" 
ON public.gamification_events 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage gamification events" 
ON public.gamification_events 
FOR ALL 
USING (auth.role() = 'service_role'::text);

-- =============================================================
-- INGREDIENT SUBSTITUTION CACHE TABLE
-- =============================================================

CREATE TABLE IF NOT EXISTS public.ingredient_substitutions_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  recipe_id uuid NULL,
  ingredient_name text NOT NULL,
  constraints jsonb DEFAULT '{}'::jsonb,
  result jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '30 days')
);

-- Create index for cache lookups
CREATE INDEX IF NOT EXISTS idx_substitutions_cache_lookup 
ON public.ingredient_substitutions_cache(user_id, ingredient_name, recipe_id);

-- Create index for expiry cleanup
CREATE INDEX IF NOT EXISTS idx_substitutions_cache_expires 
ON public.ingredient_substitutions_cache(expires_at);

-- Enable RLS
ALTER TABLE public.ingredient_substitutions_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies for substitutions cache
CREATE POLICY "Users can view own substitution cache" 
ON public.ingredient_substitutions_cache 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own substitution cache" 
ON public.ingredient_substitutions_cache 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage substitution cache" 
ON public.ingredient_substitutions_cache 
FOR ALL 
USING (auth.role() = 'service_role'::text);

-- =============================================================
-- XP LEVEL CALCULATION FUNCTION
-- =============================================================

CREATE OR REPLACE FUNCTION public.rpc_compute_level(p_xp integer)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_level integer := 1;
  v_thresholds integer[] := ARRAY[0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200];
  v_xp_into_level integer;
  v_xp_needed integer;
  i integer;
BEGIN
  -- Find current level based on XP
  FOR i IN 1..array_length(v_thresholds, 1) LOOP
    IF p_xp >= v_thresholds[i] THEN
      v_level := i;
    ELSE
      EXIT;
    END IF;
  END LOOP;
  
  -- Calculate XP into current level and XP needed for next
  IF v_level >= array_length(v_thresholds, 1) THEN
    -- Max level reached
    v_xp_into_level := p_xp - v_thresholds[v_level];
    v_xp_needed := 0;
  ELSE
    v_xp_into_level := p_xp - v_thresholds[v_level];
    v_xp_needed := v_thresholds[v_level + 1] - v_thresholds[v_level];
  END IF;
  
  RETURN jsonb_build_object(
    'level', v_level,
    'xp_into_level', v_xp_into_level,
    'xp_needed', v_xp_needed,
    'total_xp', p_xp
  );
END;
$$;

-- =============================================================
-- ATOMIC XP AWARDING RPC (IDEMPOTENT)
-- =============================================================

CREATE OR REPLACE FUNCTION public.rpc_award_xp(
  p_user_id uuid,
  p_event_type text,
  p_xp_delta integer,
  p_idempotency_key text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_event uuid;
  v_current_xp integer;
  v_new_xp integer;
  v_level_info jsonb;
  v_current_date date;
  v_last_activity_date date;
  v_new_streak integer;
BEGIN
  -- Check if event already processed (idempotency)
  SELECT id INTO v_existing_event
  FROM gamification_events
  WHERE user_id = p_user_id AND idempotency_key = p_idempotency_key;
  
  IF v_existing_event IS NOT NULL THEN
    -- Already processed, return current state without re-applying
    SELECT 
      COALESCE(ug.xp, 0), 
      rpc_compute_level(COALESCE(ug.xp, 0)),
      COALESCE(ug.streak_days, 0)
    INTO v_current_xp, v_level_info, v_new_streak
    FROM user_gamification ug
    WHERE ug.user_id = p_user_id;
    
    RETURN jsonb_build_object(
      'success', true,
      'already_processed', true,
      'xp', COALESCE(v_current_xp, 0),
      'level_info', v_level_info,
      'streak_days', COALESCE(v_new_streak, 0)
    );
  END IF;
  
  -- Lock and get current gamification state
  SELECT xp, last_activity_date, streak_days 
  INTO v_current_xp, v_last_activity_date, v_new_streak
  FROM user_gamification
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  -- Initialize if not exists
  IF v_current_xp IS NULL THEN
    v_current_xp := 0;
    v_new_streak := 0;
  END IF;
  
  v_current_date := (now() AT TIME ZONE 'Europe/Paris')::date;
  
  -- Update streak if this is a daily activity
  IF p_event_type = 'streak_daily_login' THEN
    IF v_last_activity_date IS NULL THEN
      v_new_streak := 1;
    ELSIF v_last_activity_date = v_current_date - 1 THEN
      v_new_streak := COALESCE(v_new_streak, 0) + 1;
    ELSIF v_last_activity_date < v_current_date - 1 THEN
      v_new_streak := 1; -- Streak broken
    END IF;
    -- If same day, don't change streak
  END IF;
  
  v_new_xp := v_current_xp + p_xp_delta;
  v_level_info := rpc_compute_level(v_new_xp);
  
  -- Insert gamification event
  INSERT INTO gamification_events (user_id, event_type, xp_delta, idempotency_key, metadata)
  VALUES (p_user_id, p_event_type, p_xp_delta, p_idempotency_key, p_metadata);
  
  -- Upsert user_gamification
  INSERT INTO user_gamification (user_id, xp, level, streak_days, last_activity_date, updated_at)
  VALUES (
    p_user_id, 
    v_new_xp, 
    (v_level_info->>'level')::integer, 
    v_new_streak, 
    v_current_date, 
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    xp = v_new_xp,
    level = (v_level_info->>'level')::integer,
    streak_days = v_new_streak,
    last_activity_date = v_current_date,
    updated_at = now();
  
  RETURN jsonb_build_object(
    'success', true,
    'already_processed', false,
    'xp', v_new_xp,
    'xp_delta', p_xp_delta,
    'level_info', v_level_info,
    'streak_days', v_new_streak
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.rpc_compute_level(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_award_xp(uuid, text, integer, text, jsonb) TO authenticated;

-- =============================================================
-- ADD SUBSTITUTION COST TO FEATURE CREDITS
-- =============================================================

-- This is handled in code via the existing check_and_consume_credits RPC