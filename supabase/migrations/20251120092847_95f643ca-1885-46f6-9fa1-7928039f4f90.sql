-- =====================================================
-- FIX: Create RPC to get weekly recipes grouped by day
-- This returns both lunch and dinner for each day
-- =====================================================

CREATE OR REPLACE FUNCTION get_weekly_recipes_by_day(
  p_user_id uuid,
  p_week_start date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_week_start date;
  v_menu_record record;
  v_result jsonb := '[]'::jsonb;
  v_day_index int;
  v_days jsonb := '[]'::jsonb;
BEGIN
  -- Determine week start (Monday of current week if not provided)
  IF p_week_start IS NULL THEN
    v_week_start := date_trunc('week', CURRENT_DATE)::date + 1;
  ELSE
    v_week_start := p_week_start;
  END IF;

  -- Get the menu for this week
  SELECT * INTO v_menu_record
  FROM user_weekly_menus
  WHERE user_id = p_user_id
    AND week_start = v_week_start
  LIMIT 1;

  -- If no menu exists, return empty array
  IF v_menu_record IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  -- Build days array with both lunch and dinner recipes
  FOR v_day_index IN 0..6 LOOP
    DECLARE
      v_current_date date := v_week_start + v_day_index;
      v_day_name text := 
        CASE v_day_index
          WHEN 0 THEN 'Lundi'
          WHEN 1 THEN 'Mardi'
          WHEN 2 THEN 'Mercredi'
          WHEN 3 THEN 'Jeudi'
          WHEN 4 THEN 'Vendredi'
          WHEN 5 THEN 'Samedi'
          WHEN 6 THEN 'Dimanche'
        END;
      v_lunch_recipe jsonb;
      v_dinner_recipe jsonb;
    BEGIN
      -- Get lunch recipe
      SELECT jsonb_build_object(
        'recipe_id', r.id,
        'title', r.title,
        'image_url', r.image_url,
        'prep_min', COALESCE(r.prep_time_min, 0),
        'total_min', COALESCE(r.total_time_min, 0),
        'calories', COALESCE(r.calories_kcal, 0),
        'proteins_g', COALESCE(r.proteins_g, 0),
        'carbs_g', COALESCE(r.carbs_g, 0),
        'fats_g', COALESCE(r.fats_g, 0),
        'servings', COALESCE(r.base_servings, 1)
      ) INTO v_lunch_recipe
      FROM user_weekly_menu_items mi
      JOIN recipes r ON r.id = mi.recipe_id
      WHERE mi.weekly_menu_id = v_menu_record.menu_id
        AND mi.day_of_week = v_day_index
        AND mi.meal_slot = 'lunch'
      LIMIT 1;

      -- Get dinner recipe
      SELECT jsonb_build_object(
        'recipe_id', r.id,
        'title', r.title,
        'image_url', r.image_url,
        'prep_min', COALESCE(r.prep_time_min, 0),
        'total_min', COALESCE(r.total_time_min, 0),
        'calories', COALESCE(r.calories_kcal, 0),
        'proteins_g', COALESCE(r.proteins_g, 0),
        'carbs_g', COALESCE(r.carbs_g, 0),
        'fats_g', COALESCE(r.fats_g, 0),
        'servings', COALESCE(r.base_servings, 1)
      ) INTO v_dinner_recipe
      FROM user_weekly_menu_items mi
      JOIN recipes r ON r.id = mi.recipe_id
      WHERE mi.weekly_menu_id = v_menu_record.menu_id
        AND mi.day_of_week = v_day_index
        AND mi.meal_slot = 'dinner'
      LIMIT 1;

      -- Add day to result
      v_days := v_days || jsonb_build_object(
        'date', v_current_date,
        'day_name', v_day_name,
        'day_index', v_day_index,
        'lunch', v_lunch_recipe,
        'dinner', v_dinner_recipe
      );
    END;
  END LOOP;

  RETURN v_days;
END;
$$;