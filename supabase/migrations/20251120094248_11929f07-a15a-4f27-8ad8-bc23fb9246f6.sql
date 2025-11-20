-- Alternative shopping list function that works with recipes.ingredients JSONB
-- Since recipe_ingredients table is not fully populated, we parse directly from JSONB

CREATE OR REPLACE FUNCTION public.get_shopping_list_from_weekly_menu(
  p_user_id uuid,
  p_week_start date DEFAULT NULL
)
RETURNS TABLE(
  ingredient_name text,
  total_quantity numeric,
  unit text,
  formatted_display text
)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_week_start date;
BEGIN
  -- Determine week start
  v_week_start := COALESCE(p_week_start, date_trunc('week', CURRENT_DATE)::date);
  
  -- Get ingredients from current week's menu, parsed and aggregated
  RETURN QUERY
  WITH menu_items AS (
    SELECT 
      uwmi.recipe_id,
      uwmi.portion_factor,
      r.ingredients as recipe_ingredients
    FROM public.user_weekly_menus uwm
    JOIN public.user_weekly_menu_items uwmi ON uwmi.weekly_menu_id = uwm.menu_id
    JOIN public.recipes r ON r.id = uwmi.recipe_id
    WHERE uwm.user_id = p_user_id
      AND uwm.week_start = v_week_start
      AND r.ingredients IS NOT NULL
  ),
  -- Extract each ingredient line from JSONB array
  ingredient_lines AS (
    SELECT
      mi.portion_factor,
      CASE
        WHEN jsonb_typeof(ing) = 'string' THEN ing #>> '{}'
        WHEN jsonb_typeof(ing) = 'object' AND ing ? 'name' THEN ing ->> 'name'
        WHEN jsonb_typeof(ing) = 'object' AND ing ? 'ingredient' THEN ing ->> 'ingredient'
        ELSE NULL
      END as raw_line
    FROM menu_items mi
    CROSS JOIN LATERAL jsonb_array_elements(mi.recipe_ingredients) as ing
  ),
  -- Parse each line into components
  parsed_ingredients AS (
    SELECT
      il.portion_factor,
      p.quantity,
      p.canonical_unit,
      public.normalize_str(p.ingredient_name) as normalized_name,
      p.ingredient_name as display_name
    FROM ingredient_lines il
    CROSS JOIN LATERAL public.parse_ingredient_line(il.raw_line) p
    WHERE il.raw_line IS NOT NULL
      AND il.raw_line != ''
      AND p.ingredient_name IS NOT NULL
  ),
  -- Scale by portion factor and aggregate
  aggregated AS (
    SELECT
      normalized_name,
      canonical_unit,
      SUM(quantity * portion_factor) as total_qty,
      -- Pick the most common display name
      (array_agg(display_name ORDER BY display_name))[1] as display_name
    FROM parsed_ingredients
    GROUP BY normalized_name, canonical_unit
    HAVING SUM(quantity * portion_factor) > 0
  )
  SELECT
    agg.display_name as ingredient_name,
    ROUND(agg.total_qty, 1) as total_quantity,
    agg.canonical_unit as unit,
    -- Format for display
    CASE
      WHEN agg.canonical_unit = 'tbsp' THEN ROUND(agg.total_qty, 1)::text || ' c.à.s de ' || agg.display_name
      WHEN agg.canonical_unit = 'tsp' THEN ROUND(agg.total_qty, 1)::text || ' c.à.c de ' || agg.display_name
      WHEN agg.canonical_unit = 'g' THEN ROUND(agg.total_qty, 0)::text || ' g de ' || agg.display_name
      WHEN agg.canonical_unit = 'kg' THEN ROUND(agg.total_qty, 2)::text || ' kg de ' || agg.display_name
      WHEN agg.canonical_unit = 'ml' THEN ROUND(agg.total_qty, 0)::text || ' ml de ' || agg.display_name
      WHEN agg.canonical_unit = 'cl' THEN ROUND(agg.total_qty, 1)::text || ' cl de ' || agg.display_name
      WHEN agg.canonical_unit = 'l' THEN ROUND(agg.total_qty, 2)::text || ' l de ' || agg.display_name
      WHEN agg.canonical_unit = 'piece' THEN 
        CASE 
          WHEN agg.total_qty = 1 THEN '1 ' || agg.display_name
          ELSE ROUND(agg.total_qty, 0)::text || ' ' || agg.display_name
        END
      WHEN agg.canonical_unit = 'pinch' THEN 'Une pincée de ' || agg.display_name
      WHEN agg.canonical_unit = 'bunch' THEN ROUND(agg.total_qty, 0)::text || ' botte(s) de ' || agg.display_name
      WHEN agg.canonical_unit = 'package' THEN ROUND(agg.total_qty, 0)::text || ' sachet(s) de ' || agg.display_name
      ELSE ROUND(agg.total_qty, 1)::text || ' ' || agg.canonical_unit || ' de ' || agg.display_name
    END as formatted_display
  FROM aggregated agg
  ORDER BY agg.display_name;
END;
$$;

COMMENT ON FUNCTION public.get_shopping_list_from_weekly_menu IS 'Generates normalized shopping list from weekly menu JSONB ingredients with proper unit normalization and aggregation';