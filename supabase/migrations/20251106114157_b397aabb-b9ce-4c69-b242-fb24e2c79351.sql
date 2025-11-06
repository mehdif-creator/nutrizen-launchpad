-- Create atomic RPC function for admin credit management
-- This ensures both user_dashboard_stats and swaps are updated atomically

CREATE OR REPLACE FUNCTION public.admin_set_user_credits(
  p_user_id uuid,
  p_credits int,
  p_operation text DEFAULT 'set'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_month date := date_trunc('month', now())::date;
  v_current_credits int;
  v_new_credits int;
  v_swap_used int := 0;
BEGIN
  -- Get current credits from user_dashboard_stats
  SELECT credits_zen INTO v_current_credits
  FROM public.user_dashboard_stats
  WHERE user_id = p_user_id;

  -- If user doesn't exist in stats, create record
  IF NOT FOUND THEN
    INSERT INTO public.user_dashboard_stats (
      user_id, 
      temps_gagne, 
      charge_mentale_pct, 
      serie_en_cours_set_count, 
      credits_zen, 
      references_count, 
      objectif_hebdos_valide
    )
    VALUES (p_user_id, 0, 0, 0, p_credits, 0, 0);
    v_current_credits := p_credits;
    v_new_credits := p_credits;
  ELSE
    -- Calculate new credits based on operation
    CASE p_operation
      WHEN 'set' THEN
        v_new_credits := p_credits;
      WHEN 'add' THEN
        v_new_credits := COALESCE(v_current_credits, 0) + p_credits;
      WHEN 'subtract' THEN
        v_new_credits := GREATEST(COALESCE(v_current_credits, 0) - p_credits, 0);
      ELSE
        RAISE EXCEPTION 'Invalid operation: %. Must be set, add, or subtract', p_operation;
    END CASE;
  END IF;

  -- Get current usage from swaps if exists
  SELECT used INTO v_swap_used
  FROM public.swaps
  WHERE user_id = p_user_id AND month = v_month;

  -- Update both tables atomically in single transaction
  UPDATE public.user_dashboard_stats
  SET credits_zen = v_new_credits
  WHERE user_id = p_user_id;

  -- Upsert swaps table
  INSERT INTO public.swaps (user_id, month, quota, used)
  VALUES (p_user_id, v_month, v_new_credits, COALESCE(v_swap_used, 0))
  ON CONFLICT (user_id, month)
  DO UPDATE SET quota = v_new_credits;

  -- Return updated credit information
  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'operation', p_operation,
    'previous_credits', v_current_credits,
    'credits_changed', p_credits,
    'new_credits', v_new_credits,
    'remaining', v_new_credits - COALESCE(v_swap_used, 0),
    'month', v_month
  );
END;
$$;