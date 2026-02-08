-- Create RPC function to get day menu for the Day Menu page
CREATE OR REPLACE FUNCTION public.get_day_menu(
  p_user_id uuid,
  p_date date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_day_name text;
  v_lunch_recipe jsonb;
  v_dinner_recipe jsonb;
  v_week_start date;
  v_menu_id uuid;
BEGIN
  -- Calculate week start (Monday)
  v_week_start := date_trunc('week', p_date)::date;
  
  -- Get day name
  v_day_name := CASE EXTRACT(DOW FROM p_date)::int
    WHEN 0 THEN 'Dimanche'
    WHEN 1 THEN 'Lundi'
    WHEN 2 THEN 'Mardi'
    WHEN 3 THEN 'Mercredi'
    WHEN 4 THEN 'Jeudi'
    WHEN 5 THEN 'Vendredi'
    WHEN 6 THEN 'Samedi'
  END;
  
  -- Get menu ID for this week
  SELECT menu_id INTO v_menu_id
  FROM user_weekly_menus
  WHERE user_id = p_user_id AND week_start = v_week_start
  LIMIT 1;
  
  IF v_menu_id IS NULL THEN
    RETURN jsonb_build_object(
      'date', p_date,
      'day_name', v_day_name,
      'lunch', NULL,
      'dinner', NULL
    );
  END IF;
  
  -- Calculate day_of_week (1=Monday to 7=Sunday for menu_items table)
  DECLARE
    v_day_of_week int := CASE EXTRACT(DOW FROM p_date)::int
      WHEN 0 THEN 7  -- Sunday
      ELSE EXTRACT(DOW FROM p_date)::int
    END;
  BEGIN
    -- Get lunch recipe
    SELECT jsonb_build_object(
      'recipe_id', r.id,
      'title', r.title,
      'image_url', COALESCE(
        r.image_url,
        CASE WHEN r.image_path IS NOT NULL 
          THEN 'https://pghdaozgxkbtsxwydemd.supabase.co/storage/v1/object/public/recipe-images/' || REPLACE(r.image_path, 'recipe-images/', '')
          ELSE NULL 
        END
      ),
      'image_path', r.image_path,
      'prep_min', COALESCE(r.prep_time_min, 0),
      'total_min', COALESCE(r.total_time_min, 0),
      'calories', COALESCE(r.calories_kcal, 0),
      'proteins_g', COALESCE(r.proteins_g, 0),
      'carbs_g', COALESCE(r.carbs_g, 0),
      'fats_g', COALESCE(r.fats_g, 0),
      'base_servings', COALESCE(r.base_servings, 1)
    )
    INTO v_lunch_recipe
    FROM user_weekly_menu_items mi
    JOIN recipes r ON r.id = mi.recipe_id
    WHERE mi.weekly_menu_id = v_menu_id 
      AND mi.day_of_week = v_day_of_week 
      AND mi.meal_slot = 'lunch'
    LIMIT 1;
    
    -- Get dinner recipe
    SELECT jsonb_build_object(
      'recipe_id', r.id,
      'title', r.title,
      'image_url', COALESCE(
        r.image_url,
        CASE WHEN r.image_path IS NOT NULL 
          THEN 'https://pghdaozgxkbtsxwydemd.supabase.co/storage/v1/object/public/recipe-images/' || REPLACE(r.image_path, 'recipe-images/', '')
          ELSE NULL 
        END
      ),
      'image_path', r.image_path,
      'prep_min', COALESCE(r.prep_time_min, 0),
      'total_min', COALESCE(r.total_time_min, 0),
      'calories', COALESCE(r.calories_kcal, 0),
      'proteins_g', COALESCE(r.proteins_g, 0),
      'carbs_g', COALESCE(r.carbs_g, 0),
      'fats_g', COALESCE(r.fats_g, 0),
      'base_servings', COALESCE(r.base_servings, 1)
    )
    INTO v_dinner_recipe
    FROM user_weekly_menu_items mi
    JOIN recipes r ON r.id = mi.recipe_id
    WHERE mi.weekly_menu_id = v_menu_id 
      AND mi.day_of_week = v_day_of_week 
      AND mi.meal_slot = 'dinner'
    LIMIT 1;
  END;
  
  RETURN jsonb_build_object(
    'date', p_date,
    'day_name', v_day_name,
    'lunch', v_lunch_recipe,
    'dinner', v_dinner_recipe
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_day_menu(uuid, date) TO authenticated;