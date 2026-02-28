-- Fix rpc_get_effective_portions: read from profiles (canonical)
-- instead of user_profiles (legacy, no longer updated)
CREATE OR REPLACE FUNCTION rpc_get_effective_portions(
  p_user_id uuid, 
  p_week_start date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_adults integer;
  v_children integer;
  v_kid_ratio numeric;
  v_strategy text;
  v_default_servings integer;
  v_effective numeric;
  v_rounded integer;
BEGIN
  -- Read from profiles (canonical table since migration 20260216)
  SELECT 
    COALESCE(household_adults, 1),
    COALESCE(household_children, 0),
    COALESCE(kid_portion_ratio, 0.7),
    COALESCE(portion_strategy, 'household'),
    COALESCE(default_servings_per_recipe, 2)
  INTO v_adults, v_children, v_kid_ratio, v_strategy, v_default_servings
  FROM public.profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'effective_servings_per_meal', 1,
      'rounded_servings', 1,
      'servings_breakdown', jsonb_build_object(
        'adults', 1, 'children', 0, 'kid_portion_ratio', 0.7
      ),
      'portion_strategy', 'household',
      'profile_complete', false
    );
  END IF;

  -- Calculate effective servings
  CASE v_strategy
    WHEN 'single'  THEN v_effective := 1;
    WHEN 'custom'  THEN v_effective := v_default_servings;
    ELSE -- 'household'
      v_effective := v_adults + (v_children * v_kid_ratio);
  END CASE;

  v_rounded := GREATEST(1, ROUND(v_effective));

  RETURN jsonb_build_object(
    'effective_servings_per_meal', v_effective,
    'rounded_servings', v_rounded,
    'servings_breakdown', jsonb_build_object(
      'adults', v_adults,
      'children', v_children,
      'kid_portion_ratio', v_kid_ratio
    ),
    'portion_strategy', v_strategy,
    'profile_complete', true
  );
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_get_effective_portions(uuid, date) TO authenticated;

-- Standardize kid_portion_ratio to 0.7 (matches frontend CHILD_PORTION_RATIO)
UPDATE public.profiles 
SET kid_portion_ratio = 0.7 
WHERE kid_portion_ratio = 0.6 OR kid_portion_ratio = 0.8;