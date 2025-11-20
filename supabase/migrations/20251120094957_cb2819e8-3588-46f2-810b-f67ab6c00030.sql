-- Fix SECURITY DEFINER view issue
-- The recipe_ingredients_normalized view needs to use SECURITY INVOKER

DROP VIEW IF EXISTS public.recipe_ingredients_normalized;

CREATE VIEW public.recipe_ingredients_normalized
WITH (security_invoker = true)
AS
SELECT
  ri.id,
  ri.recipe_id,
  ri.ingredient_name,
  public.normalize_str(ri.ingredient_name) as normalized_name,
  COALESCE(ri.normalized_quantity, ri.quantity_g_num, 1) as quantity,
  COALESCE(ri.canonical_unit, 'g') as unit,
  ri.ingredient_line_raw
FROM public.recipe_ingredients ri;

COMMENT ON VIEW public.recipe_ingredients_normalized IS 'Normalized recipe ingredients view - uses SECURITY INVOKER for proper RLS enforcement';