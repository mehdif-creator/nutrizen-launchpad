-- Update RPC to use 1-7 for day_of_week to match DB constraint
CREATE OR REPLACE FUNCTION public.get_weekly_recipes_by_day(p_user_id uuid, p_week_start date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_week_start date;
  v_menu_record record;
  v_day_index int;
  v_days jsonb := '[]'::jsonb;
BEGIN
  IF p_week_start IS NULL THEN
    v_week_start := date_trunc('week', CURRENT_DATE)::date;
  ELSE
    v_week_start := p_week_start;
  END IF;

  SELECT * INTO v_menu_record FROM user_weekly_menus
  WHERE user_id = p_user_id AND week_start = v_week_start LIMIT 1;

  IF v_menu_record IS NULL THEN RETURN '[]'::jsonb; END IF;

  FOR v_day_index IN 1..7 LOOP
    DECLARE
      v_current_date date := v_week_start + (v_day_index - 1);
      v_day_name text := CASE v_day_index WHEN 1 THEN 'Lundi' WHEN 2 THEN 'Mardi' WHEN 3 THEN 'Mercredi' WHEN 4 THEN 'Jeudi' WHEN 5 THEN 'Vendredi' WHEN 6 THEN 'Samedi' WHEN 7 THEN 'Dimanche' END;
      v_lunch_recipe jsonb; v_dinner_recipe jsonb;
    BEGIN
      SELECT jsonb_build_object('recipe_id', r.id, 'title', r.title, 'image_url', COALESCE(r.image_url, CASE WHEN r.image_path IS NOT NULL THEN 'https://pghdaozgxkbtsxwydemd.supabase.co/storage/v1/object/public/recipe-images/' || REPLACE(r.image_path, 'recipe-images/', '') ELSE NULL END), 'prep_min', COALESCE(r.prep_time_min, 0), 'total_min', COALESCE(r.total_time_min, 0), 'calories', COALESCE(r.calories_kcal, 0), 'proteins_g', COALESCE(r.proteins_g, 0), 'carbs_g', COALESCE(r.carbs_g, 0), 'fats_g', COALESCE(r.fats_g, 0), 'servings', COALESCE(r.base_servings, 1))
      INTO v_lunch_recipe FROM user_weekly_menu_items mi JOIN recipes r ON r.id = mi.recipe_id
      WHERE mi.weekly_menu_id = v_menu_record.menu_id AND mi.day_of_week = v_day_index AND mi.meal_slot = 'lunch' LIMIT 1;

      SELECT jsonb_build_object('recipe_id', r.id, 'title', r.title, 'image_url', COALESCE(r.image_url, CASE WHEN r.image_path IS NOT NULL THEN 'https://pghdaozgxkbtsxwydemd.supabase.co/storage/v1/object/public/recipe-images/' || REPLACE(r.image_path, 'recipe-images/', '') ELSE NULL END), 'prep_min', COALESCE(r.prep_time_min, 0), 'total_min', COALESCE(r.total_time_min, 0), 'calories', COALESCE(r.calories_kcal, 0), 'proteins_g', COALESCE(r.proteins_g, 0), 'carbs_g', COALESCE(r.carbs_g, 0), 'fats_g', COALESCE(r.fats_g, 0), 'servings', COALESCE(r.base_servings, 1))
      INTO v_dinner_recipe FROM user_weekly_menu_items mi JOIN recipes r ON r.id = mi.recipe_id
      WHERE mi.weekly_menu_id = v_menu_record.menu_id AND mi.day_of_week = v_day_index AND mi.meal_slot = 'dinner' LIMIT 1;

      v_days := v_days || jsonb_build_object('date', v_current_date, 'day_name', v_day_name, 'day_index', v_day_index - 1, 'lunch', v_lunch_recipe, 'dinner', v_dinner_recipe);
    END;
  END LOOP;
  RETURN v_days;
END;
$function$;