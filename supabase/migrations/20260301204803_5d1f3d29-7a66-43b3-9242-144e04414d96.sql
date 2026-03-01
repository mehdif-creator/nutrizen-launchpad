
-- Fix get_shopping_list_from_weekly_menu to compute portion factor from user profile
-- instead of using the stored (incorrect) portion_factor.
-- This ensures shopping list quantities match what RecipeDetail shows.
CREATE OR REPLACE FUNCTION public.get_shopping_list_from_weekly_menu(p_user_id uuid, p_week_start date DEFAULT NULL::date)
 RETURNS TABLE(ingredient_name text, total_quantity numeric, unit text, formatted_display text)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE 
  v_week_start date;
  v_adults integer;
  v_children integer;
  v_kid_ratio numeric;
  v_effective_portions numeric;
BEGIN
  v_week_start := COALESCE(p_week_start, date_trunc('week', CURRENT_DATE)::date);
  
  -- Read household profile to compute effective portions (same formula as rpc_get_effective_portions)
  SELECT 
    COALESCE(household_adults, 1),
    COALESCE(household_children, 0),
    COALESCE(kid_portion_ratio, 0.7)
  INTO v_adults, v_children, v_kid_ratio
  FROM public.profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    v_effective_portions := 1;
  ELSE
    v_effective_portions := v_adults + (v_children * v_kid_ratio);
  END IF;

  RETURN QUERY
  WITH menu_items AS (
    SELECT uwmi.recipe_id, 
           -- Use effective_portions / recipe.servings as the portion multiplier
           -- recipe.servings = what the ingredients are written for (usually 1 person)
           v_effective_portions / GREATEST(COALESCE(r.servings, 1), 1) as computed_portion_factor,
           r.ingredients as recipe_ingredients
    FROM public.user_weekly_menus uwm
    JOIN public.user_weekly_menu_items uwmi ON uwmi.weekly_menu_id = uwm.menu_id
    JOIN public.recipes r ON r.id = uwmi.recipe_id
    WHERE uwm.user_id = p_user_id AND uwm.week_start = v_week_start AND r.ingredients IS NOT NULL
  ),
  ingredient_lines AS (
    SELECT mi.computed_portion_factor as portion_factor,
      CASE
        WHEN jsonb_typeof(ing) = 'string' THEN ing #>> '{}'
        WHEN jsonb_typeof(ing) = 'object' AND ing ? 'name' THEN ing ->> 'name'
        WHEN jsonb_typeof(ing) = 'object' AND ing ? 'ingredient' THEN ing ->> 'ingredient'
        ELSE NULL
      END as raw_line
    FROM menu_items mi
    CROSS JOIN LATERAL jsonb_array_elements(mi.recipe_ingredients) as ing
  ),
  parsed_ingredients AS (
    SELECT il.portion_factor, p.quantity,
      CASE WHEN p.canonical_unit = 'cl' THEN 'ml' ELSE p.canonical_unit END as canonical_unit,
      CASE WHEN p.canonical_unit = 'cl' THEN p.quantity * 10 ELSE p.quantity END as adj_quantity,
      public.normalize_str(p.ingredient_name) as normalized_name,
      p.ingredient_name as display_name
    FROM ingredient_lines il
    CROSS JOIN LATERAL public.parse_ingredient_line(il.raw_line) p
    WHERE il.raw_line IS NOT NULL AND il.raw_line != ''
      AND p.ingredient_name IS NOT NULL AND p.quantity > 0
  ),
  aggregated AS (
    SELECT normalized_name, canonical_unit,
      SUM(adj_quantity * portion_factor) as total_qty,
      (array_agg(display_name ORDER BY length(display_name) DESC))[1] as display_name
    FROM parsed_ingredients
    GROUP BY normalized_name, canonical_unit
    HAVING SUM(adj_quantity * portion_factor) > 0.05
  ),
  display_ready AS (
    SELECT display_name, normalized_name,
      CASE
        WHEN canonical_unit = 'ml' AND total_qty >= 1000 THEN 'l'
        WHEN canonical_unit = 'l'  AND total_qty < 1    THEN 'ml'
        ELSE canonical_unit
      END as display_unit,
      CASE
        WHEN canonical_unit = 'ml' AND total_qty >= 1000 THEN ROUND(total_qty / 1000, 2)
        WHEN canonical_unit = 'l'  AND total_qty < 1    THEN ROUND(total_qty * 1000, 0)
        ELSE ROUND(total_qty, 1)
      END as display_qty
    FROM aggregated
  )
  SELECT
    dr.display_name as ingredient_name,
    dr.display_qty as total_quantity,
    dr.display_unit as unit,
    CASE
      WHEN dr.display_unit = 'tbsp' THEN
        CASE WHEN dr.display_qty <= 1 THEN '1 c. à soupe de ' ELSE ROUND(dr.display_qty,0)::text || ' c. à soupe de ' END || dr.display_name
      WHEN dr.display_unit = 'tsp' THEN
        CASE WHEN dr.display_qty <= 1 THEN '1 c. à café de ' ELSE ROUND(dr.display_qty,0)::text || ' c. à café de ' END || dr.display_name
      WHEN dr.display_unit = 'g'   THEN ROUND(dr.display_qty,0)::text || ' g de ' || dr.display_name
      WHEN dr.display_unit = 'kg'  THEN dr.display_qty::text || ' kg de ' || dr.display_name
      WHEN dr.display_unit = 'ml'  THEN ROUND(dr.display_qty,0)::text || ' ml de ' || dr.display_name
      WHEN dr.display_unit = 'l'   THEN dr.display_qty::text || ' l de ' || dr.display_name
      WHEN dr.display_unit = 'pinch' THEN
        CASE WHEN dr.display_qty <= 1 THEN 'Une pincée de ' ELSE ROUND(dr.display_qty,0)::text || ' pincées de ' END || dr.display_name
      WHEN dr.display_unit = 'bunch' THEN
        CASE WHEN dr.display_qty <= 1 THEN '1 botte de ' ELSE ROUND(dr.display_qty,0)::text || ' bottes de ' END || dr.display_name
      WHEN dr.display_unit = 'package' THEN ROUND(dr.display_qty,0)::text || ' sachet(s) de ' || dr.display_name
      WHEN dr.display_unit = 'piece' THEN
        CASE
          WHEN dr.display_qty <= 1 THEN '1 ' || dr.display_name
          ELSE ROUND(dr.display_qty,0)::text || ' ' ||
            regexp_replace(
              regexp_replace(
                regexp_replace(dr.display_name, '^gousse\s+', 'gousses ', 'i'),
              '^tranche\s+', 'tranches ', 'i'),
            '^morceau\s+', 'morceaux ', 'i')
        END
      ELSE
        CASE
          WHEN dr.display_qty > 0 THEN ROUND(dr.display_qty,1)::text || ' ' || COALESCE(dr.display_unit,'') || ' ' || dr.display_name
          ELSE dr.display_name
        END
    END as formatted_display
  FROM display_ready
  ORDER BY dr.display_name;
END;
$function$;
