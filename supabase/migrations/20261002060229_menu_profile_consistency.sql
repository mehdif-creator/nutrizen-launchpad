-- Deploy BEFORE generate-menu/use-swap and the UI. No recipe is auto-certified.
ALTER TABLE public.user_weekly_menu_items ALTER COLUMN target_servings TYPE numeric USING target_servings::numeric;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS menu_profile_ready boolean NOT NULL DEFAULT true;
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS safety_review jsonb;
COMMENT ON COLUMN public.recipes.safety_review IS
  'Human-reviewed restrictions: reviewed_by, reviewed_at, allergen_free[], trace_free[], diets[], medical_conditions[]. Null means unverified. Labels use the normalized vocabulary in menuPlanning.ts.';

CREATE OR REPLACE FUNCTION public.invalidate_recipe_safety_review()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF (to_jsonb(NEW) - ARRAY['safety_review','updated_at','image_url','image_path'])
     IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['safety_review','updated_at','image_url','image_path']) THEN
    NEW.safety_review := NULL;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER recipe_safety_review_invalidation BEFORE UPDATE ON public.recipes
FOR EACH ROW EXECUTE FUNCTION public.invalidate_recipe_safety_review();

CREATE TABLE public.menu_action_receipts (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('generate', 'swap')),
  input jsonb NOT NULL,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, request_id)
);
ALTER TABLE public.menu_action_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.menu_action_receipts FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.menu_action_receipts TO service_role;

-- One statement / one snapshot; query errors cannot become empty allergies.
CREATE OR REPLACE FUNCTION public.get_menu_profile_context(p_user_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
SELECT jsonb_build_object(
  'profile', COALESCE((SELECT to_jsonb(t) FROM public.user_profile t WHERE user_id = p_user_id), '{}'),
  'objectives', COALESCE((SELECT to_jsonb(t) FROM public.user_objectives t WHERE user_id = p_user_id), '{}'),
  'habits', COALESCE((SELECT to_jsonb(t) FROM public.user_eating_habits t WHERE user_id = p_user_id), '{}'),
  'mealsConfig', COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY meal_type) FROM public.user_meals_config t WHERE user_id = p_user_id), '[]'),
  'allergies', (SELECT to_jsonb(t) FROM public.user_allergies t WHERE user_id = p_user_id),
  'foodStyle', (SELECT to_jsonb(t) FROM public.user_food_style t WHERE user_id = p_user_id),
  'nutrition', COALESCE((SELECT to_jsonb(t) FROM public.user_nutrition_goals t WHERE user_id = p_user_id), '{}'),
  'household', COALESCE((SELECT to_jsonb(t) FROM public.user_household t WHERE user_id = p_user_id), '{}'),
  'lifestyle', COALESCE((SELECT to_jsonb(t) FROM public.user_lifestyle t WHERE user_id = p_user_id), '{}'),
  'legacyPreferences', COALESCE((SELECT to_jsonb(t) FROM public.preferences t WHERE user_id = p_user_id), '{}'),
  'legacyProfile', COALESCE((SELECT jsonb_build_object('household_adults',household_adults,'household_children',household_children,'kid_portion_ratio',kid_portion_ratio,'meals_per_day',meals_per_day,'required_fields_ok',required_fields_ok,'menu_profile_ready',menu_profile_ready) FROM public.profiles WHERE id = p_user_id), '{}')
);
$$;
REVOKE ALL ON FUNCTION public.get_menu_profile_context(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_menu_profile_context(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.get_menu_recipe_catalog(p_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
SELECT COALESCE(jsonb_agg(to_jsonb(r) || jsonb_build_object('validation_signature', md5(to_jsonb(r)::text)) ORDER BY r.id), '[]')
FROM (SELECT * FROM public.recipes WHERE published = true ORDER BY id LIMIT 500 OFFSET greatest(p_offset,0)) r;
$$;
REVOKE ALL ON FUNCTION public.get_menu_recipe_catalog(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_menu_recipe_catalog(integer) TO service_role;

CREATE OR REPLACE FUNCTION public.commit_weekly_menu(
  p_user_id uuid, p_week_start date, p_request_id uuid, p_action text, p_input jsonb,
  p_context jsonb, p_payload jsonb, p_expected_payload jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_menu public.user_weekly_menus%ROWTYPE;
  v_receipt public.menu_action_receipts%ROWTYPE;
  v_day jsonb; v_meal jsonb; v_slot text; v_index integer;
  v_recipe public.recipes%ROWTYPE;
  v_portions numeric; v_factor numeric; v_feature text; v_cost integer;
  v_credits jsonb; v_result jsonb; v_payload jsonb; v_count integer := 0;
  v_ids uuid[] := '{}'; v_expected_count integer;
BEGIN
  IF p_user_id IS NULL OR p_request_id IS NULL OR p_action NOT IN ('generate','swap') OR extract(isodow FROM p_week_start) <> 1 THEN
    RAISE EXCEPTION 'Invalid menu operation';
  END IF;
  -- Serialize generation and swaps for one user, including retries arriving concurrently.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));
  SELECT * INTO v_receipt FROM public.menu_action_receipts WHERE user_id=p_user_id AND request_id=p_request_id;
  IF FOUND THEN
    IF v_receipt.action <> p_action OR v_receipt.input IS DISTINCT FROM p_input THEN RAISE EXCEPTION 'Request id conflict'; END IF;
    RETURN v_receipt.result;
  END IF;
  SELECT * INTO v_menu FROM public.user_weekly_menus WHERE user_id=p_user_id AND week_start=p_week_start FOR UPDATE;
  IF v_menu.payload IS DISTINCT FROM p_expected_payload THEN
    RETURN jsonb_build_object('success',false,'error_code','MENU_CHANGED','message','Le menu a changé. Actualisez la page avant de réessayer.');
  END IF;
  IF p_action='swap' AND v_menu.menu_id IS NULL THEN RAISE EXCEPTION 'Menu not found'; END IF;
  -- The profile editor first marks this row incomplete before saving its sections.
  -- A concurrent edit either precedes this lock (and is rejected) or waits for commit.
  PERFORM 1 FROM public.profiles WHERE id=p_user_id FOR SHARE;
  IF public.get_menu_profile_context(p_user_id) IS DISTINCT FROM p_context THEN
    RETURN jsonb_build_object('success',false,'error_code','PROFILE_CHANGED','message','Votre profil a changé pendant la préparation. Relancez la demande.');
  END IF;
  IF (p_context #>> '{legacyProfile,required_fields_ok}') IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'Incomplete profile'; END IF;
  IF (p_context #>> '{legacyProfile,menu_profile_ready}') IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'Profile save incomplete'; END IF;
  IF p_payload->>'version' IS DISTINCT FROM '2' OR jsonb_typeof(p_payload->'days') IS DISTINCT FROM 'array'
    OR jsonb_array_length(p_payload->'days') <> 7 OR jsonb_typeof(p_payload->'meal_slots') IS DISTINCT FROM 'array'
    OR p_payload->'meal_slots' NOT IN ('["lunch"]'::jsonb,'["dinner"]'::jsonb,'["lunch","dinner"]'::jsonb) THEN RAISE EXCEPTION 'Incomplete menu'; END IF;
  v_expected_count := 7 * jsonb_array_length(p_payload->'meal_slots');
  FOR v_index IN 0..6 LOOP
    v_day := p_payload->'days'->v_index;
    IF v_day->>'date' IS DISTINCT FROM (p_week_start+v_index)::text THEN RAISE EXCEPTION 'Invalid menu date'; END IF;
    FOREACH v_slot IN ARRAY ARRAY['lunch','dinner'] LOOP
      v_meal := v_day->v_slot;
      IF NOT (p_payload->'meal_slots' ? v_slot) THEN
        IF v_meal IS NOT NULL AND v_meal <> 'null'::jsonb THEN RAISE EXCEPTION 'Unexpected slot'; END IF;
        CONTINUE;
      END IF;
      IF v_meal IS NULL OR v_meal='null'::jsonb THEN RAISE EXCEPTION 'Missing slot'; END IF;
      SELECT * INTO v_recipe FROM public.recipes WHERE id=(v_meal->>'recipe_id')::uuid AND published=true FOR SHARE;
      IF NOT FOUND THEN RAISE EXCEPTION 'Recipe unavailable'; END IF;
      IF v_meal->>'recipe_signature' IS DISTINCT FROM md5(to_jsonb(v_recipe)::text) THEN
        RETURN jsonb_build_object('success',false,'error_code','CATALOG_CHANGED','message','Une recette a été modifiée. Relancez la demande pour la vérifier.');
      END IF;
      IF v_recipe.id = ANY(v_ids) THEN RAISE EXCEPTION 'Duplicate recipe'; END IF;
      v_ids := array_append(v_ids,v_recipe.id);
      v_portions := (v_meal->>'servings_used')::numeric;
      v_factor := (v_meal->>'portion_factor')::numeric;
      IF v_portions IS NULL OR v_portions <= 0 OR v_portions > 50 OR v_factor IS NULL OR v_factor <= 0
        OR v_recipe.base_servings IS NULL OR v_recipe.base_servings <= 0
        OR abs(v_factor-v_portions/v_recipe.base_servings) > .000001 THEN RAISE EXCEPTION 'Invalid portions'; END IF;
      v_count := v_count+1;
    END LOOP;
  END LOOP;
  IF v_count <> v_expected_count THEN RAISE EXCEPTION 'Incomplete menu'; END IF;
  IF p_action='swap' THEN
    -- A swap may replace precisely one existing cell, never erase another meal/day.
    IF (p_input->>'day')::integer NOT BETWEEN 0 AND 6 OR p_input->>'meal_type' NOT IN ('lunch','dinner') THEN RAISE EXCEPTION 'Invalid swap slot'; END IF;
    IF v_menu.payload #>> ARRAY['days',p_input->>'day',p_input->>'meal_type','recipe_id'] IS DISTINCT FROM p_input->>'recipe_id' THEN RAISE EXCEPTION 'Stale swap'; END IF;
    IF (p_payload #- ARRAY['days',p_input->>'day',p_input->>'meal_type']) IS DISTINCT FROM
       (v_menu.payload #- ARRAY['days',p_input->>'day',p_input->>'meal_type']) THEN RAISE EXCEPTION 'Swap changed other meals'; END IF;
    IF p_payload #>> ARRAY['days',p_input->>'day',p_input->>'meal_type','recipe_id'] = p_input->>'recipe_id' THEN RAISE EXCEPTION 'Swap did not change recipe'; END IF;
    v_feature := 'swap';
  ELSE
    v_feature := CASE WHEN v_expected_count=14 THEN 'generate_week_2' ELSE 'generate_week_1' END;
  END IF;
  SELECT cost INTO v_cost FROM public.feature_costs WHERE feature=v_feature;
  v_cost := COALESCE(v_cost, CASE v_feature WHEN 'swap' THEN 1 WHEN 'generate_week_2' THEN 11 ELSE 6 END);
  IF v_cost <= 0 THEN RAISE EXCEPTION 'Invalid feature cost'; END IF;
  v_credits := public.check_and_consume_credits(p_user_id,v_feature,v_cost);
  IF (v_credits->>'success')::boolean IS DISTINCT FROM true THEN RETURN v_credits; END IF;
  -- Any exception after debit rolls back the entire PostgreSQL transaction.
  v_payload := p_payload || jsonb_build_object('profile_signature',md5(p_context::text));
  INSERT INTO public.user_weekly_menus(user_id,week_start,payload) VALUES(p_user_id,p_week_start,v_payload)
  ON CONFLICT(user_id,week_start) DO UPDATE SET payload=EXCLUDED.payload,updated_at=now()
  RETURNING * INTO v_menu;
  DELETE FROM public.user_weekly_menu_items WHERE weekly_menu_id=v_menu.menu_id;
  DELETE FROM public.user_daily_recipes WHERE user_id=p_user_id AND date BETWEEN p_week_start AND p_week_start+6;
  FOR v_index IN 0..6 LOOP
    v_day := v_payload->'days'->v_index;
    FOREACH v_slot IN ARRAY ARRAY['lunch','dinner'] LOOP
      v_meal := v_day->v_slot;
      IF v_meal IS NULL OR v_meal='null'::jsonb THEN CONTINUE; END IF;
      INSERT INTO public.user_weekly_menu_items(weekly_menu_id,recipe_id,day_of_week,meal_slot,target_servings,portion_factor,scale_factor)
      VALUES(v_menu.menu_id,(v_meal->>'recipe_id')::uuid,v_index+1,v_slot,(v_meal->>'servings_used')::numeric,(v_meal->>'portion_factor')::numeric,(v_meal->>'portion_factor')::numeric);
    END LOOP;
    INSERT INTO public.user_daily_recipes(user_id,date,lunch_recipe_id,dinner_recipe_id)
    VALUES(p_user_id,p_week_start+v_index,(v_day #>> '{lunch,recipe_id}')::uuid,(v_day #>> '{dinner,recipe_id}')::uuid);
  END LOOP;
  v_result := jsonb_build_object('success',true,'menu_id',v_menu.menu_id,'week_start',p_week_start,'days',v_payload->'days',
    'ai_generated',false,'validated_recipes',v_count,'total_slots',v_count,'creditsRemaining',v_credits->'new_balance');
  IF p_action='swap' THEN
    v_meal := v_payload #> ARRAY['days',p_input->>'day',p_input->>'meal_type'];
    v_result := v_result || jsonb_build_object('newRecipe',v_meal || jsonb_build_object('id',v_meal->>'recipe_id'));
  END IF;
  INSERT INTO public.menu_action_receipts(user_id,request_id,action,input,result) VALUES(p_user_id,p_request_id,p_action,p_input,v_result);
  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.commit_weekly_menu(uuid,date,uuid,text,jsonb,jsonb,jsonb,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.commit_weekly_menu(uuid,date,uuid,text,jsonb,jsonb,jsonb,jsonb) TO service_role;

-- Hide obsolete menus after a profile/catalog change, including the legacy fallback UI.
CREATE OR REPLACE FUNCTION public.get_visible_weekly_menu(p_user_id uuid, p_week_start date DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_menu public.user_weekly_menus%ROWTYPE; v_valid boolean;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id AND COALESCE(auth.jwt()->>'role','') <> 'service_role' THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_menu FROM public.user_weekly_menus WHERE user_id=p_user_id AND week_start=COALESCE(p_week_start,date_trunc('week',CURRENT_DATE)::date);
  IF NOT FOUND THEN RETURN NULL; END IF;
  v_valid := v_menu.payload->>'version' = '2' AND v_menu.payload->>'profile_signature'=md5(public.get_menu_profile_context(p_user_id)::text);
  IF v_valid THEN
    SELECT NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_menu.payload->'days') d
      CROSS JOIN LATERAL (VALUES(d->'lunch'),(d->'dinner')) m(meal)
      LEFT JOIN public.recipes r ON r.id=(m.meal->>'recipe_id')::uuid
      WHERE m.meal IS NOT NULL AND m.meal <> 'null'::jsonb
      AND (r.id IS NULL OR r.published IS DISTINCT FROM true OR m.meal->>'recipe_signature' IS DISTINCT FROM md5(to_jsonb(r)::text))
    ) INTO v_valid;
  END IF;
  IF v_valid IS DISTINCT FROM true THEN
    RETURN to_jsonb(v_menu) || jsonb_build_object('needs_regeneration',true,'payload',jsonb_build_object('days','[]'::jsonb));
  END IF;
  RETURN to_jsonb(v_menu) || jsonb_build_object('needs_regeneration',false);
END;
$$;
REVOKE ALL ON FUNCTION public.get_visible_weekly_menu(uuid,date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_visible_weekly_menu(uuid,date) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.get_weekly_recipes_by_day(p_user_id uuid,p_week_start date DEFAULT NULL)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
SELECT COALESCE(public.get_visible_weekly_menu(p_user_id,p_week_start) #> '{payload,days}','[]'::jsonb);
$$;
REVOKE ALL ON FUNCTION public.get_weekly_recipes_by_day(uuid,date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_weekly_recipes_by_day(uuid,date) TO authenticated,service_role;

-- Reuse the existing string parser, but retain ALL quantity/unit fields for JSON ingredients.
CREATE OR REPLACE FUNCTION public.menu_ingredient_line(p_ingredient jsonb)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
SELECT CASE jsonb_typeof(p_ingredient)
  WHEN 'string' THEN p_ingredient #>> '{}'
  WHEN 'object' THEN CASE
    WHEN COALESCE(p_ingredient->>'quantity',p_ingredient->>'quantite',p_ingredient->>'amount') IS NOT NULL THEN
      concat_ws(' ',COALESCE(p_ingredient->>'quantity',p_ingredient->>'quantite',p_ingredient->>'amount'),
        COALESCE(p_ingredient->>'unit',p_ingredient->>'unite'),
        COALESCE(p_ingredient->>'name',p_ingredient->>'nom',p_ingredient->>'ingredient'))
    ELSE COALESCE(p_ingredient->>'raw',p_ingredient->>'name',p_ingredient->>'nom',p_ingredient->>'ingredient') END
  ELSE NULL END;
$$;
REVOKE ALL ON FUNCTION public.menu_ingredient_line(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.menu_ingredient_line(jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.parse_menu_ingredient(p_ingredient jsonb)
RETURNS TABLE(quantity numeric, canonical_unit text, ingredient_name text)
LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
DECLARE v_line text; v_match text[]; v_has_quantity boolean; v_left numeric; v_right numeric; v_parsed record;
BEGIN
  v_line := trim(public.menu_ingredient_line(p_ingredient));
  IF v_line IS NULL OR v_line='' THEN RAISE EXCEPTION 'Empty recipe ingredient'; END IF;
  IF v_line ~ '^-' THEN RAISE EXCEPTION 'Negative ingredient quantity'; END IF;
  v_line := regexp_replace(v_line,'(\d)([½¼¾])','\1 \2','g');
  v_line := replace(replace(replace(v_line,'½','1/2'),'¼','1/4'),'¾','3/4');
  -- Buy the upper bound of a recipe range; do not parse "2-3" as 2 pieces of "-3".
  v_match := regexp_match(v_line, '^(\d+\s+\d+/\d+|\d+/\d+|\d+(?:[.,]\d+)?)\s*[-–]\s*(\d+\s+\d+/\d+|\d+/\d+|\d+(?:[.,]\d+)?)(.*)$');
  IF v_match IS NOT NULL THEN
    SELECT p.quantity INTO v_left FROM public.parse_ingredient_line(v_match[1] || ' portion') p;
    SELECT p.quantity INTO v_right FROM public.parse_ingredient_line(v_match[2] || ' portion') p;
    IF v_left <= 0 OR v_right <= 0 THEN RAISE EXCEPTION 'Invalid quantity range'; END IF;
    v_line := greatest(v_left,v_right)::text || v_match[3];
  END IF;
  v_has_quantity := v_line ~ '^\d';
  IF NOT v_has_quantity THEN
    RETURN QUERY SELECT NULL::numeric,'as_needed'::text,v_line;
    RETURN;
  END IF;
  SELECT * INTO v_parsed FROM public.parse_ingredient_line(v_line);
  IF NOT FOUND OR v_parsed.quantity IS NULL OR v_parsed.quantity <= 0 THEN RAISE EXCEPTION 'Unreadable recipe ingredient'; END IF;
  RETURN QUERY SELECT v_parsed.quantity,v_parsed.canonical_unit,v_parsed.ingredient_name;
END;
$$;
REVOKE ALL ON FUNCTION public.parse_menu_ingredient(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.parse_menu_ingredient(jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.get_shopping_list_from_weekly_menu(p_user_id uuid,p_week_start date DEFAULT NULL)
RETURNS TABLE(ingredient_name text,total_quantity numeric,unit text,formatted_display text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_menu jsonb;
BEGIN
  v_menu := public.get_visible_weekly_menu(p_user_id,p_week_start);
  IF v_menu IS NULL THEN RETURN; END IF;
  IF (v_menu->>'needs_regeneration')::boolean THEN RAISE EXCEPTION 'Le profil ou une recette a changé. Régénérez le menu pour actualiser les courses.'; END IF;
  RETURN QUERY
  WITH lines AS (
    SELECT mi.portion_factor AS factor,i.value AS ingredient
    FROM public.user_weekly_menu_items mi JOIN public.recipes r ON r.id=mi.recipe_id
    CROSS JOIN LATERAL jsonb_array_elements(r.ingredients) i
    WHERE mi.weekly_menu_id=(v_menu->>'menu_id')::uuid
  ), parsed AS (
    SELECT p.ingredient_name AS name,
      CASE WHEN p.canonical_unit='kg' THEN 'g' WHEN p.canonical_unit IN ('l','cl') THEN 'ml' ELSE p.canonical_unit END AS unit,
      p.quantity*l.factor*CASE p.canonical_unit WHEN 'kg' THEN 1000 WHEN 'l' THEN 1000 WHEN 'cl' THEN 10 ELSE 1 END AS qty
    FROM lines l CROSS JOIN LATERAL public.parse_menu_ingredient(l.ingredient) p
  ), grouped AS (
    SELECT min(p.name) AS name,p.unit,sum(p.qty) AS qty FROM parsed p
    WHERE p.name IS NOT NULL AND (p.qty>0 OR p.qty IS NULL)
    GROUP BY public.normalize_str(p.name),p.unit
  )
  SELECT g.name, round(g.qty,3),g.unit,
    CASE WHEN g.qty IS NULL THEN 'Selon le goût : ' || g.name ELSE
    trim(trailing '.' FROM trim(trailing '0' FROM to_char(round(g.qty,3),'FM999999990.000'))) || ' ' ||
    CASE g.unit WHEN 'piece' THEN '' WHEN 'tbsp' THEN 'c. à soupe de ' WHEN 'tsp' THEN 'c. à café de ' WHEN 'pinch' THEN 'pincée(s) de ' ELSE g.unit || ' de ' END || g.name END
  FROM grouped g ORDER BY g.name;
END;
$$;
REVOKE ALL ON FUNCTION public.get_shopping_list_from_weekly_menu(uuid,date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_shopping_list_from_weekly_menu(uuid,date) TO authenticated,service_role;
