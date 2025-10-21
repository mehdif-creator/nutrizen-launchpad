-- Enable RLS on recipe_ingredients table
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;

-- Allow public read access for ingredients of published recipes
CREATE POLICY "Public can view ingredients for published recipes"
ON recipe_ingredients FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM recipes r
    WHERE r.id = recipe_ingredients.recipe_id
    AND r.published = true
  )
);

-- Allow admins to manage all ingredients
CREATE POLICY "Admins can manage all ingredients"
ON recipe_ingredients FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Allow service role for automated processes
CREATE POLICY "Service role can manage ingredients"
ON recipe_ingredients FOR ALL
USING (auth.role() = 'service_role');

-- Enable RLS on recipe_macro_audit table
ALTER TABLE recipe_macro_audit ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Only admins can view audit logs"
ON recipe_macro_audit FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Service role can insert audit logs
CREATE POLICY "Service role can insert audit logs"
ON recipe_macro_audit FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- Fix function search_path issues
-- Update generate_referral_code function
CREATE OR REPLACE FUNCTION public.generate_referral_code(user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  code text;
  profile_data record;
BEGIN
  -- Get user profile
  SELECT * INTO profile_data FROM profiles WHERE id = user_id;
  
  -- Generate code from name or email
  IF profile_data.full_name IS NOT NULL AND profile_data.full_name != '' THEN
    code := lower(regexp_replace(profile_data.full_name, '[^a-zA-Z0-9]', '', 'g'));
  ELSE
    code := lower(split_part(profile_data.email, '@', 1));
  END IF;
  
  -- Add random suffix to ensure uniqueness
  code := code || substring(md5(random()::text) from 1 for 4);
  
  -- Ensure uniqueness
  WHILE EXISTS (SELECT 1 FROM referrals WHERE referral_code = code) LOOP
    code := code || substring(md5(random()::text) from 1 for 2);
  END LOOP;
  
  RETURN code;
END;
$function$;

-- Update create_referral_code_for_new_user function
CREATE OR REPLACE FUNCTION public.create_referral_code_for_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.referrals (referrer_id, referral_code)
  VALUES (NEW.id, public.generate_referral_code(NEW.id))
  ON CONFLICT (referral_code) DO NOTHING;
  
  RETURN NEW;
END;
$function$;

-- Update recipe_ingredients_after_change function
CREATE OR REPLACE FUNCTION public.recipe_ingredients_after_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  affected_id uuid;
BEGIN
  -- Get the UUID of the affected recipe
  IF TG_OP = 'DELETE' THEN
    affected_id := OLD.recipe_id;
  ELSE
    affected_id := NEW.recipe_id;
  END IF;
  
  -- Call the recalculation function
  IF affected_id IS NOT NULL THEN
    PERFORM public.refresh_one_recipe(affected_id);
  END IF;
  
  RETURN NULL;
END;
$function$;

-- Update refresh_recipe_macros_from_ciqual function
CREATE OR REPLACE FUNCTION public.refresh_recipe_macros_from_ciqual()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.recipes AS r
  SET
    calories_kcal = COALESCE(sub.total_calories, 0),
    proteins_g    = COALESCE(sub.total_proteins, 0),
    carbs_g       = COALESCE(sub.total_carbs, 0),
    fats_g        = COALESCE(sub.total_fats, 0),
    fibers_g      = COALESCE(sub.total_fibers, 0)
  FROM (
    SELECT
      ri.recipe_id,
      SUM( (COALESCE(ri.quantity_g,0)::numeric / 100.0) * COALESCE(cc.calories_kcal, 0) ) AS total_calories,
      SUM( (COALESCE(ri.quantity_g,0)::numeric / 100.0) * COALESCE(cc.proteins_g, 0) )   AS total_proteins,
      SUM( (COALESCE(ri.quantity_g,0)::numeric / 100.0) * COALESCE(cc.carbs_g, 0) )      AS total_carbs,
      SUM( (COALESCE(ri.quantity_g,0)::numeric / 100.0) * COALESCE(cc.fats_g, 0) )       AS total_fats,
      SUM( (COALESCE(ri.quantity_g,0)::numeric / 100.0) * COALESCE(cc.fibers_g, 0) )     AS total_fibers
    FROM public.recipe_ingredients AS ri
    LEFT JOIN public.ciqual_core AS cc
      ON cc.alim_code::text = ri.ciqual_id::text
    GROUP BY ri.recipe_id
  ) AS sub
  WHERE r.id::text = sub.recipe_id::text;

  RAISE NOTICE '✅ Macros updated for all recipes (via ciqual_core join).';
END;
$function$;

-- Update refresh_recipe_macros function
CREATE OR REPLACE FUNCTION public.refresh_recipe_macros()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.recipes AS r
  SET 
    calories_kcal = sub.total_calories,
    proteins_g   = sub.total_proteins,
    carbs_g      = sub.total_carbs,
    fats_g       = sub.total_fats,
    fibers_g     = sub.total_fibers
  FROM (
    SELECT 
      ri.recipe_id,
      SUM(ri.calories_kcal) AS total_calories,
      SUM(ri.proteins_g)    AS total_proteins,
      SUM(ri.carbs_g)       AS total_carbs,
      SUM(ri.fats_g)        AS total_fats,
      SUM(ri.fibers_g)      AS total_fibers
    FROM public.recipe_ingredients AS ri
    GROUP BY ri.recipe_id
  ) AS sub
  WHERE r.id = sub.recipe_id;

  RAISE NOTICE '✅ Macros updated for all recipes.';
END;
$function$;

-- Update guard_zero_kcal_mapping function
CREATE OR REPLACE FUNCTION public.guard_zero_kcal_mapping()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE kcal numeric;
BEGIN
  IF NEW.ciqual_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT calories_kcal INTO kcal
  FROM public.ciqual_core
  WHERE alim_code::text = NEW.ciqual_id::text
  LIMIT 1;

  IF (COALESCE(kcal,0) <= 4.99)
     AND NEW.ingredient_name !~* '(eau|minéral|boisson|café|the|thé|infusion|bouillon|jus|vinaigre|sel|poivre|épice|épices|herbe|herbes|arom|sirop)'
  THEN
    RAISE EXCEPTION 'CIQUAL % (%.0f kcal) invalid for ingredient "%".',
      NEW.ciqual_id, COALESCE(kcal,0), NEW.ingredient_name
      USING HINT = 'Choose a non-null CIQUAL code (>=5 kcal/100g) for solids.';
  END IF;

  RETURN NEW;
END $function$;

-- Update get_recipe_macros function
CREATE OR REPLACE FUNCTION public.get_recipe_macros(recipe_id_input bigint)
RETURNS TABLE(total_calories numeric, total_proteins numeric, total_carbs numeric, total_fats numeric, total_fibers numeric)
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    ROUND(SUM(cf.calories_kcal * ri.quantity_g / 100), 2) AS total_calories,
    ROUND(SUM(cf.proteins_g * ri.quantity_g / 100), 2) AS total_proteins,
    ROUND(SUM(cf.carbs_g * ri.quantity_g / 100), 2) AS total_carbs,
    ROUND(SUM(cf.fats_g * ri.quantity_g / 100), 2) AS total_fats,
    ROUND(SUM(cf.fibers_g * ri.quantity_g / 100), 2) AS total_fibers
  FROM public.recipe_ingredients ri
  JOIN public.ciqual_foods cf ON cf.id = ri.ciqual_id
  WHERE ri.recipe_id = recipe_id_input;
END;
$function$;