
-- Fix the alias reference in get_shopping_list_from_weekly_menu
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
  
  SELECT 
    COALESCE(p.household_adults, 1),
    COALESCE(p.household_children, 0),
    COALESCE(p.kid_portion_ratio, 0.7)
  INTO v_adults, v_children, v_kid_ratio
  FROM public.profiles p
  WHERE p.id = p_user_id;

  IF NOT FOUND THEN
    v_effective_portions := 1;
  ELSE
    v_effective_portions := v_adults + (v_children * v_kid_ratio);
  END IF;

  RETURN QUERY
  WITH menu_items AS (
    SELECT uwmi.recipe_id, 
           v_effective_portions / GREATEST(COALESCE(r.servings, 1), 1) as computed_pf,
           r.ingredients as recipe_ingredients
    FROM public.user_weekly_menus uwm
    JOIN public.user_weekly_menu_items uwmi ON uwmi.weekly_menu_id = uwm.menu_id
    JOIN public.recipes r ON r.id = uwmi.recipe_id
    WHERE uwm.user_id = p_user_id AND uwm.week_start = v_week_start AND r.ingredients IS NOT NULL
  ),
  ingredient_lines AS (
    SELECT mi.computed_pf as pf,
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
    SELECT il.pf, parsed.quantity,
      CASE WHEN parsed.canonical_unit = 'cl' THEN 'ml' ELSE parsed.canonical_unit END as canonical_unit,
      CASE WHEN parsed.canonical_unit = 'cl' THEN parsed.quantity * 10 ELSE parsed.quantity END as adj_quantity,
      public.normalize_str(parsed.ingredient_name) as normalized_name,
      parsed.ingredient_name as display_name
    FROM ingredient_lines il
    CROSS JOIN LATERAL public.parse_ingredient_line(il.raw_line) parsed
    WHERE il.raw_line IS NOT NULL AND il.raw_line != ''
      AND parsed.ingredient_name IS NOT NULL AND parsed.quantity > 0
  ),
  aggregated AS (
    SELECT pi2.normalized_name, pi2.canonical_unit,
      SUM(pi2.adj_quantity * pi2.pf) as total_qty,
      (array_agg(pi2.display_name ORDER BY length(pi2.display_name) DESC))[1] as display_name
    FROM parsed_ingredients pi2
    GROUP BY pi2.normalized_name, pi2.canonical_unit
    HAVING SUM(pi2.adj_quantity * pi2.pf) > 0.05
  ),
  display_ready AS (
    SELECT agg.display_name, agg.normalized_name,
      CASE
        WHEN agg.canonical_unit = 'ml' AND agg.total_qty >= 1000 THEN 'l'
        WHEN agg.canonical_unit = 'l'  AND agg.total_qty < 1    THEN 'ml'
        ELSE agg.canonical_unit
      END as display_unit,
      CASE
        WHEN agg.canonical_unit = 'ml' AND agg.total_qty >= 1000 THEN ROUND(agg.total_qty / 1000, 2)
        WHEN agg.canonical_unit = 'l'  AND agg.total_qty < 1    THEN ROUND(agg.total_qty * 1000, 0)
        ELSE ROUND(agg.total_qty, 1)
      END as display_qty
    FROM aggregated agg
  )
  SELECT
    d.display_name,
    d.display_qty,
    d.display_unit,
    CASE
      WHEN d.display_unit = 'tbsp' THEN
        CASE WHEN d.display_qty <= 1 THEN '1 c. à soupe de ' ELSE ROUND(d.display_qty,0)::text || ' c. à soupe de ' END || d.display_name
      WHEN d.display_unit = 'tsp' THEN
        CASE WHEN d.display_qty <= 1 THEN '1 c. à café de ' ELSE ROUND(d.display_qty,0)::text || ' c. à café de ' END || d.display_name
      WHEN d.display_unit = 'g'   THEN ROUND(d.display_qty,0)::text || ' g de ' || d.display_name
      WHEN d.display_unit = 'kg'  THEN d.display_qty::text || ' kg de ' || d.display_name
      WHEN d.display_unit = 'ml'  THEN ROUND(d.display_qty,0)::text || ' ml de ' || d.display_name
      WHEN d.display_unit = 'l'   THEN d.display_qty::text || ' l de ' || d.display_name
      WHEN d.display_unit = 'pinch' THEN
        CASE WHEN d.display_qty <= 1 THEN 'Une pincée de ' ELSE ROUND(d.display_qty,0)::text || ' pincées de ' END || d.display_name
      WHEN d.display_unit = 'bunch' THEN
        CASE WHEN d.display_qty <= 1 THEN '1 botte de ' ELSE ROUND(d.display_qty,0)::text || ' bottes de ' END || d.display_name
      WHEN d.display_unit = 'package' THEN ROUND(d.display_qty,0)::text || ' sachet(s) de ' || d.display_name
      WHEN d.display_unit = 'piece' THEN
        CASE
          WHEN d.display_qty <= 1 THEN '1 ' || d.display_name
          ELSE ROUND(d.display_qty,0)::text || ' ' ||
            regexp_replace(
              regexp_replace(
                regexp_replace(d.display_name, '^gousse\s+', 'gousses ', 'i'),
              '^tranche\s+', 'tranches ', 'i'),
            '^morceau\s+', 'morceaux ', 'i')
        END
      ELSE
        CASE
          WHEN d.display_qty > 0 THEN ROUND(d.display_qty,1)::text || ' ' || COALESCE(d.display_unit,'') || ' ' || d.display_name
          ELSE d.display_name
        END
    END as formatted_display
  FROM display_ready d
  ORDER BY d.display_name;
END;
$function$;
