-- Fix swap quota manipulation vulnerability
-- Remove all existing policies on swaps table
DROP POLICY IF EXISTS "Users can manage own swaps" ON swaps;

-- Add SELECT-only policy for users
CREATE POLICY "Users can view own swaps"
ON swaps FOR SELECT
USING (auth.uid() = user_id);

-- Add admin policy for management
CREATE POLICY "Admins can manage all swaps"
ON swaps FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add CHECK constraint to enforce quota limits
ALTER TABLE swaps 
DROP CONSTRAINT IF EXISTS swaps_used_within_quota;

ALTER TABLE swaps 
ADD CONSTRAINT swaps_used_within_quota 
CHECK (used >= 0 AND used <= quota);

-- Create atomic function for using swaps
CREATE OR REPLACE FUNCTION use_swap_atomic(
  p_user_id uuid,
  p_month date,
  p_meal_plan_id uuid,
  p_day int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_swap record;
  v_new_used int;
BEGIN
  -- Lock row for update to prevent race conditions
  SELECT * INTO v_swap
  FROM swaps
  WHERE user_id = p_user_id AND month = p_month
  FOR UPDATE;

  -- If no record exists, create one with default quota
  IF NOT FOUND THEN
    INSERT INTO swaps (user_id, month, quota, used)
    VALUES (p_user_id, p_month, 10, 0)
    RETURNING * INTO v_swap;
  END IF;

  -- Check quota
  IF v_swap.used >= v_swap.quota THEN
    RAISE EXCEPTION 'Quota épuisé pour ce mois';
  END IF;

  -- Increment used count atomically
  v_new_used := v_swap.used + 1;
  
  UPDATE swaps
  SET used = v_new_used
  WHERE user_id = p_user_id AND month = p_month;

  -- Return updated swap info
  RETURN jsonb_build_object(
    'used', v_new_used,
    'quota', v_swap.quota,
    'remaining', v_swap.quota - v_new_used,
    'meal_plan_id', p_meal_plan_id,
    'day', p_day
  );
END;
$$;

-- Add constraints for support tickets to prevent abuse
ALTER TABLE support_tickets 
DROP CONSTRAINT IF EXISTS subject_length_check;

ALTER TABLE support_tickets 
ADD CONSTRAINT subject_length_check 
CHECK (length(subject) >= 5 AND length(subject) <= 200);

-- Add constraint to limit message size in JSONB
ALTER TABLE support_tickets 
DROP CONSTRAINT IF EXISTS messages_size_check;

ALTER TABLE support_tickets 
ADD CONSTRAINT messages_size_check 
CHECK (pg_column_size(messages) < 100000);

-- Create index for rate limiting queries on support tickets
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_created 
ON support_tickets(user_id, created_at DESC);

-- Create index for preferences rate limiting
CREATE INDEX IF NOT EXISTS idx_preferences_user_updated 
ON preferences(user_id, updated_at DESC);