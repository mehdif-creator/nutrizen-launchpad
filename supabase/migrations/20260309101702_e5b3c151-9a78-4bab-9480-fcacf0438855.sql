
-- 1. Fix the broken RPC (date = text cast error) and add referral_code + top meals
CREATE OR REPLACE FUNCTION public.get_shared_week_plan(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_link record;
  v_menu record;
  v_profile record;
  v_days jsonb;
  v_top_meals jsonb;
  v_total_calories numeric := 0;
  v_meal_count int := 0;
  v_day jsonb;
  v_meals_arr jsonb := '[]'::jsonb;
  i int;
BEGIN
  SELECT * INTO v_link
  FROM public.share_links
  WHERE token = p_token
    AND (expires_at IS NULL OR expires_at > now());

  IF v_link IS NULL THEN
    RETURN jsonb_build_object('error', 'Lien invalide ou expiré.');
  END IF;

  SELECT menu_id, week_start, payload, created_at
  INTO v_menu
  FROM public.user_weekly_menus
  WHERE user_id = v_link.user_id
    AND week_start = v_link.week_start_date;

  IF v_menu IS NULL THEN
    RETURN jsonb_build_object('error', 'Menu introuvable pour cette semaine.');
  END IF;

  SELECT display_name, avatar_url, referral_code
  INTO v_profile
  FROM public.profiles
  WHERE id = v_link.user_id;

  v_days := v_menu.payload->'days';

  FOR i IN 0..jsonb_array_length(v_days)-1 LOOP
    v_day := v_days->i;
    IF v_day->'lunch' IS NOT NULL AND v_day->'lunch' != 'null'::jsonb THEN
      v_meal_count := v_meal_count + 1;
      v_total_calories := v_total_calories + COALESCE((v_day->'lunch'->>'calories')::numeric, 0);
      v_meals_arr := v_meals_arr || jsonb_build_array(
        jsonb_build_object(
          'title', v_day->'lunch'->>'title',
          'image_url', v_day->'lunch'->>'image_url',
          'calories', COALESCE((v_day->'lunch'->>'calories')::int, 0),
          'prep_min', COALESCE((v_day->'lunch'->>'prep_min')::int, 0),
          'total_min', COALESCE((v_day->'lunch'->>'total_min')::int, 0),
          'proteins_g', COALESCE((v_day->'lunch'->>'proteins_g')::int, 0),
          'day_name', v_day->>'day',
          'meal_type', 'Déjeuner'
        )
      );
    END IF;
    IF v_day->'dinner' IS NOT NULL AND v_day->'dinner' != 'null'::jsonb THEN
      v_meal_count := v_meal_count + 1;
      v_total_calories := v_total_calories + COALESCE((v_day->'dinner'->>'calories')::numeric, 0);
      v_meals_arr := v_meals_arr || jsonb_build_array(
        jsonb_build_object(
          'title', v_day->'dinner'->>'title',
          'image_url', v_day->'dinner'->>'image_url',
          'calories', COALESCE((v_day->'dinner'->>'calories')::int, 0),
          'prep_min', COALESCE((v_day->'dinner'->>'prep_min')::int, 0),
          'total_min', COALESCE((v_day->'dinner'->>'total_min')::int, 0),
          'proteins_g', COALESCE((v_day->'dinner'->>'proteins_g')::int, 0),
          'day_name', v_day->>'day',
          'meal_type', 'Dîner'
        )
      );
    END IF;
  END LOOP;

  SELECT jsonb_agg(m ORDER BY (m->>'calories')::int DESC)
  INTO v_top_meals
  FROM jsonb_array_elements(v_meals_arr) AS m;

  IF v_top_meals IS NOT NULL AND jsonb_array_length(v_top_meals) > 4 THEN
    v_top_meals := (SELECT jsonb_agg(e) FROM (SELECT e FROM jsonb_array_elements(v_top_meals) AS e LIMIT 4) sub);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'week_start', v_menu.week_start,
    'menu_id', v_menu.menu_id,
    'top_meals', COALESCE(v_top_meals, '[]'::jsonb),
    'stats', jsonb_build_object(
      'total_meals', v_meal_count,
      'avg_calories_per_day', CASE WHEN v_meal_count > 0 THEN round(v_total_calories / 7) ELSE 0 END
    ),
    'created_at', v_menu.created_at,
    'shared_by', jsonb_build_object(
      'display_name', COALESCE(v_profile.display_name, 'Un utilisateur NutriZen'),
      'avatar_url', v_profile.avatar_url,
      'referral_code', v_profile.referral_code
    )
  );
END;
$$;

-- 2. Add recipe_id column to share_links for recipe sharing
ALTER TABLE public.share_links ADD COLUMN IF NOT EXISTS recipe_id uuid REFERENCES public.recipes(id);

-- 3. Make week_start_date nullable (recipe shares won't have it)
ALTER TABLE public.share_links ALTER COLUMN week_start_date DROP NOT NULL;

-- 4. Create RPC for shared recipe
CREATE OR REPLACE FUNCTION public.get_shared_recipe(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_link record;
  v_recipe record;
  v_profile record;
BEGIN
  SELECT * INTO v_link
  FROM public.share_links
  WHERE token = p_token
    AND recipe_id IS NOT NULL
    AND (expires_at IS NULL OR expires_at > now());

  IF v_link IS NULL THEN
    RETURN jsonb_build_object('error', 'Lien invalide ou expiré.');
  END IF;

  SELECT id, title, image_url, image_path, calories_kcal, proteins_g, carbs_g, fats_g,
         prep_time_min, cook_time_min, total_time_min, servings, diet_type, cuisine_type, meal_type
  INTO v_recipe
  FROM public.recipes
  WHERE id = v_link.recipe_id;

  IF v_recipe IS NULL THEN
    RETURN jsonb_build_object('error', 'Recette introuvable.');
  END IF;

  SELECT display_name, avatar_url, referral_code
  INTO v_profile
  FROM public.profiles
  WHERE id = v_link.user_id;

  RETURN jsonb_build_object(
    'success', true,
    'recipe', jsonb_build_object(
      'id', v_recipe.id,
      'title', v_recipe.title,
      'image_url', COALESCE(v_recipe.image_url, v_recipe.image_path),
      'calories_kcal', v_recipe.calories_kcal,
      'proteins_g', v_recipe.proteins_g,
      'carbs_g', v_recipe.carbs_g,
      'fats_g', v_recipe.fats_g,
      'total_time_min', v_recipe.total_time_min,
      'servings', v_recipe.servings,
      'diet_type', v_recipe.diet_type,
      'cuisine_type', v_recipe.cuisine_type,
      'meal_type', v_recipe.meal_type
    ),
    'shared_by', jsonb_build_object(
      'display_name', COALESCE(v_profile.display_name, 'Un utilisateur NutriZen'),
      'avatar_url', v_profile.avatar_url,
      'referral_code', v_profile.referral_code
    )
  );
END;
$$;
