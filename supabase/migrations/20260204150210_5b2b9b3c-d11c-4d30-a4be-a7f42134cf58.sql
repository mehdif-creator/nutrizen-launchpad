-- Fix get_recipe_macros_page: Remove SECURITY DEFINER and filter to published recipes only
-- This ensures the function respects the same access rules as the recipes table RLS

CREATE OR REPLACE FUNCTION public.get_recipe_macros_page(
  p_last_recipe_id uuid DEFAULT NULL,
  p_limit int DEFAULT 25
)
RETURNS TABLE (
  recipe_id uuid,
  calories_kcal numeric,
  proteins_g numeric,
  carbs_g numeric,
  fats_g numeric,
  fibers_g numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER  -- Changed from SECURITY DEFINER to respect RLS
SET search_path = public
AS $$
  SELECT 
    m.recipe_id,
    m.calories_kcal,
    m.proteins_g,
    m.carbs_g,
    m.fats_g,
    m.fibers_g
  FROM recipe_macros_mv2 m
  INNER JOIN recipes r ON r.id = m.recipe_id
  WHERE 
    r.published = true  -- Only return published recipes
    AND (p_last_recipe_id IS NULL OR m.recipe_id > p_last_recipe_id)
  ORDER BY m.recipe_id ASC
  LIMIT p_limit;
$$;

-- Ensure authenticated users can still call this function
GRANT EXECUTE ON FUNCTION public.get_recipe_macros_page(uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_recipe_macros_page(uuid, int) TO anon;