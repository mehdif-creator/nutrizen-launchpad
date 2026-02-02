-- Create RPC for cursor-based pagination of recipe macros
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
SECURITY DEFINER
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
  WHERE (p_last_recipe_id IS NULL OR m.recipe_id > p_last_recipe_id)
  ORDER BY m.recipe_id ASC
  LIMIT p_limit;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_recipe_macros_page(uuid, int) TO authenticated;

-- Create function to refresh the materialized view (admin only)
CREATE OR REPLACE FUNCTION public.refresh_recipe_macros_mv2()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check admin role
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  
  -- Refresh concurrently to avoid locking reads
  REFRESH MATERIALIZED VIEW CONCURRENTLY recipe_macros_mv2;
END;
$$;

-- Grant execute to authenticated users (function checks admin internally)
GRANT EXECUTE ON FUNCTION public.refresh_recipe_macros_mv2() TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_recipe_macros_page IS 'Cursor-based pagination for recipe macros. Uses recipe_id as cursor.';
COMMENT ON FUNCTION public.refresh_recipe_macros_mv2 IS 'Refreshes the recipe_macros_mv2 materialized view. Admin only.';