-- Function to deduct 7 credits for week regeneration
CREATE OR REPLACE FUNCTION public.deduct_week_regeneration_credits(p_user_id uuid, p_month date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_swap record;
  v_new_used int;
  v_credits_needed int := 7;
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

  -- Check if enough credits available
  IF (v_swap.quota - v_swap.used) < v_credits_needed THEN
    RAISE EXCEPTION 'Crédits insuffisants. Il te reste % crédits, mais 7 sont nécessaires.', (v_swap.quota - v_swap.used);
  END IF;

  -- Deduct 7 credits atomically
  v_new_used := v_swap.used + v_credits_needed;
  
  UPDATE swaps
  SET used = v_new_used
  WHERE user_id = p_user_id AND month = p_month;

  -- Return updated swap info
  RETURN jsonb_build_object(
    'used', v_new_used,
    'quota', v_swap.quota,
    'remaining', v_swap.quota - v_new_used,
    'credits_deducted', v_credits_needed
  );
END;
$$;