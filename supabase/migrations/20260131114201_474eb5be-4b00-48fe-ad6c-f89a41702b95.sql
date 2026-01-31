-- Fix search_path for get_menu_servings_used function
CREATE OR REPLACE FUNCTION get_menu_servings_used(p_payload jsonb, p_day text DEFAULT NULL)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_days jsonb;
  v_day jsonb;
BEGIN
  v_days := p_payload->'days';
  
  IF p_day IS NULL THEN
    -- Return first day's servings as default
    v_day := v_days->0;
  ELSE
    -- Find specific day
    SELECT d INTO v_day
    FROM jsonb_array_elements(v_days) d
    WHERE d->>'day' = p_day
    LIMIT 1;
  END IF;
  
  RETURN COALESCE((v_day->>'servings_used')::numeric, 2);
END;
$$;