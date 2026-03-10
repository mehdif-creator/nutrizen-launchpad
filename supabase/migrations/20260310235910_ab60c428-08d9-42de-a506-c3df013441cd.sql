CREATE OR REPLACE FUNCTION public.rpc_get_effective_portions(p_user_id uuid, p_week_start date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_adults integer;
  v_children integer;
  v_kid_ratio numeric;
  v_strategy text;
  v_default_servings integer;
  v_effective numeric;
  v_rounded integer;
  v_household_total numeric;
BEGIN
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
      'servings_breakdown', jsonb_build_object('adults', 1, 'children', 0, 'kid_portion_ratio', 0.7),
      'portion_strategy', 'household',
      'profile_complete', false
    );
  END IF;

  SELECT total_portions INTO v_household_total
  FROM public.user_household WHERE user_id = p_user_id;

  CASE v_strategy
    WHEN 'single' THEN v_effective := 1;
    WHEN 'custom' THEN v_effective := v_default_servings;
    ELSE
      IF v_household_total IS NOT NULL AND v_household_total > 0 THEN
        v_effective := v_household_total;
      ELSE
        v_effective := v_adults + (v_children * v_kid_ratio);
      END IF;
  END CASE;

  v_rounded := GREATEST(1, ROUND(v_effective));

  RETURN jsonb_build_object(
    'effective_servings_per_meal', v_effective,
    'rounded_servings', v_rounded,
    'servings_breakdown', jsonb_build_object('adults', v_adults, 'children', v_children, 'kid_portion_ratio', v_kid_ratio),
    'portion_strategy', v_strategy,
    'profile_complete', true
  );
END;
$function$