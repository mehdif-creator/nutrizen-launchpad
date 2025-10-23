-- Fix search_path for all SECURITY DEFINER functions
-- This addresses the Supabase linter warning about mutable search_path

-- Fix update_updated_at_column() function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix refresh_one_recipe(uuid) function to ensure it has search_path
CREATE OR REPLACE FUNCTION public.refresh_one_recipe(p_recipe_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  agg_tot_cal numeric := 0;
  agg_tot_prot numeric := 0;
  agg_tot_carbs numeric := 0;
  agg_tot_fats numeric := 0;
  agg_tot_fibers numeric := 0;
  agg_ing_count int := 0;
  agg_zero_count int := 0;
BEGIN
  WITH agg AS (
    SELECT
      COALESCE(SUM((ri.quantity_g::numeric / 100.0) * COALESCE(c.energie_kcal_100g, 0)), 0) AS tot_cal,
      COALESCE(SUM((ri.quantity_g::numeric / 100.0) * COALESCE(c.proteines_g_100g, 0)), 0) AS tot_prot,
      COALESCE(SUM((ri.quantity_g::numeric / 100.0) * COALESCE(c.glucides_g_100g, 0)), 0) AS tot_carbs,
      COALESCE(SUM((ri.quantity_g::numeric / 100.0) * COALESCE(c.lipides_g_100g, 0)), 0) AS tot_fats,
      COALESCE(SUM((ri.quantity_g::numeric / 100.0) * COALESCE(c.fibres_alimentaires_g_100g, 0)), 0) AS tot_fibers,
      COUNT(*) AS ing_count,
      COUNT(*) FILTER (WHERE c.energie_kcal_100g = 0 OR c.energie_kcal_100g IS NULL) AS zero_count
    FROM public.recipe_ingredients ri
    LEFT JOIN public.ciqual_full c
      ON ri.ciqual_id::text = c.alim_code
    WHERE ri.recipe_id = p_recipe_id
  )
  SELECT tot_cal, tot_prot, tot_carbs, tot_fats, tot_fibers, ing_count, zero_count
  INTO agg_tot_cal, agg_tot_prot, agg_tot_carbs, agg_tot_fats, agg_tot_fibers, agg_ing_count, agg_zero_count
  FROM agg;

  UPDATE public.recipes r
  SET
    calories_kcal = agg_tot_cal,
    proteins_g    = agg_tot_prot,
    carbs_g       = agg_tot_carbs,
    fats_g        = agg_tot_fats,
    fibers_g      = agg_tot_fibers,
    macros_calculated = (agg_ing_count > 0 AND agg_zero_count = 0),
    updated_at = now()
  WHERE r.id = p_recipe_id;
END;
$$;