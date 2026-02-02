-- Drop existing functions to recreate with correct signatures
DROP FUNCTION IF EXISTS public.update_grocery_item_checked(uuid, text, boolean);
DROP FUNCTION IF EXISTS public.generate_grocery_list(uuid);

-- Create RPC function to update grocery item checked state
CREATE OR REPLACE FUNCTION public.update_grocery_item_checked(
  p_grocery_list_id uuid,
  p_ingredient_key text,
  p_checked boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Verify ownership
  SELECT user_id INTO v_user_id
  FROM grocery_lists
  WHERE id = p_grocery_list_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Grocery list not found';
  END IF;

  IF v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Update the specific item's checked status in the JSONB array
  UPDATE grocery_lists
  SET 
    items = (
      SELECT jsonb_agg(
        CASE 
          WHEN item->>'ingredient_key' = p_ingredient_key 
          THEN jsonb_set(item, '{checked}', to_jsonb(p_checked))
          ELSE item
        END
      )
      FROM jsonb_array_elements(items) AS item
    ),
    generated_at = now()
  WHERE id = p_grocery_list_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.update_grocery_item_checked(uuid, text, boolean) TO authenticated;

-- Add week_start column to grocery_lists for idempotent upserts if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'grocery_lists' 
    AND column_name = 'week_start'
  ) THEN
    ALTER TABLE public.grocery_lists ADD COLUMN week_start date;
  END IF;
END $$;

-- Update existing rows to have week_start derived from weekly_menu_id
UPDATE grocery_lists gl
SET week_start = uwm.week_start::date
FROM user_weekly_menus uwm
WHERE gl.weekly_menu_id = uwm.menu_id
AND gl.week_start IS NULL;

-- Create unique index (not constraint) for idempotent grocery list generation
-- Using partial index to handle nulls
CREATE UNIQUE INDEX IF NOT EXISTS idx_grocery_lists_user_week_unique 
ON public.grocery_lists(user_id, week_start) 
WHERE week_start IS NOT NULL;

-- Create function to generate grocery list from weekly menu with portion scaling
CREATE OR REPLACE FUNCTION public.generate_grocery_list(p_weekly_menu_id uuid)
RETURNS jsonb[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_week_start date;
  v_portions integer;
  v_result jsonb[];
  v_existing_items jsonb;
  v_grocery_list_id uuid;
BEGIN
  -- Get user_id and week_start from the menu
  SELECT user_id, week_start::date INTO v_user_id, v_week_start
  FROM user_weekly_menus
  WHERE menu_id = p_weekly_menu_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Menu not found';
  END IF;

  -- Get user's portion preference
  SELECT COALESCE(personnes, 1) INTO v_portions
  FROM preferences
  WHERE user_id = v_user_id;

  IF v_portions IS NULL THEN
    v_portions := 1;
  END IF;

  -- Get existing grocery list to preserve checked states
  SELECT id, items INTO v_grocery_list_id, v_existing_items
  FROM grocery_lists
  WHERE user_id = v_user_id AND week_start = v_week_start;

  -- Aggregate ingredients from all recipes in the menu
  WITH menu_recipes AS (
    SELECT DISTINCT recipe_id
    FROM user_daily_recipes
    WHERE user_id = v_user_id
    AND date >= v_week_start
    AND date < v_week_start + interval '7 days'
    AND recipe_id IS NOT NULL
  ),
  recipe_data AS (
    SELECT 
      ri.ingredient_name,
      ri.ingredient_name_norm,
      ri.normalized_quantity,
      ri.canonical_unit,
      r.base_servings,
      r.id as recipe_id,
      r.title as recipe_title
    FROM menu_recipes mr
    JOIN recipes r ON r.id = mr.recipe_id
    JOIN recipe_ingredients ri ON ri.recipe_id = r.id
  ),
  aggregated AS (
    SELECT 
      LOWER(COALESCE(ingredient_name_norm, ingredient_name)) as ingredient_key,
      INITCAP(COALESCE(ingredient_name_norm, ingredient_name)) as name,
      SUM(
        COALESCE(normalized_quantity, 1) * 
        (v_portions::numeric / COALESCE(base_servings, 4)::numeric)
      ) as quantity,
      COALESCE(canonical_unit, 'pièce') as unit,
      jsonb_agg(DISTINCT recipe_title) as recipe_sources,
      CASE 
        WHEN LOWER(COALESCE(ingredient_name_norm, ingredient_name)) ~ '(tomate|carotte|oignon|ail|pomme|salade|légume|fruit|courgette|poireau|épinard|brocoli|chou|céleri|concombre|radis|navet|betterave|aubergine|poivron|artichaut|asperge|champignon|laitue|endive|fenouil|haricot vert)' THEN 'Fruits & Légumes'
        WHEN LOWER(COALESCE(ingredient_name_norm, ingredient_name)) ~ '(poulet|boeuf|porc|veau|agneau|canard|dinde|viande|saucisse|jambon|bacon|lard|poisson|saumon|thon|cabillaud|crevette|moule|huître|crabe|homard|gambas)' THEN 'Viandes & Poissons'
        WHEN LOWER(COALESCE(ingredient_name_norm, ingredient_name)) ~ '(lait|fromage|crème|beurre|yaourt|yogourt|mascarpone|ricotta|mozzarella|parmesan|gruyère|emmental|chèvre|roquefort|camembert|brie)' THEN 'Produits laitiers'
        WHEN LOWER(COALESCE(ingredient_name_norm, ingredient_name)) ~ '(riz|pâte|spaghetti|nouille|quinoa|semoule|boulgour|pain|farine|pomme de terre|patate|lentille|pois chiche|haricot sec)' THEN 'Féculents'
        WHEN LOWER(COALESCE(ingredient_name_norm, ingredient_name)) ~ '(huile|vinaigre|sel|poivre|épice|herbe|sucre|miel|confiture|chocolat|cacao|vanille|cannelle|curry|cumin|paprika|thym|romarin|basilic|persil|coriandre|menthe)' THEN 'Épicerie'
        ELSE 'Divers'
      END as category
    FROM recipe_data
    WHERE ingredient_name IS NOT NULL
    GROUP BY 
      LOWER(COALESCE(ingredient_name_norm, ingredient_name)),
      INITCAP(COALESCE(ingredient_name_norm, ingredient_name)),
      COALESCE(canonical_unit, 'pièce')
  )
  SELECT array_agg(
    jsonb_build_object(
      'ingredient_key', a.ingredient_key || '|' || a.unit,
      'name', a.name,
      'quantity', ROUND(a.quantity::numeric, 1),
      'unit', a.unit,
      'category', a.category,
      'recipe_sources', a.recipe_sources,
      'checked', COALESCE(
        (SELECT (existing_item->>'checked')::boolean
         FROM jsonb_array_elements(v_existing_items) existing_item
         WHERE existing_item->>'ingredient_key' = (a.ingredient_key || '|' || a.unit)
        ), false
      )
    )
    ORDER BY a.category, a.name
  )
  INTO v_result
  FROM aggregated a;

  -- Delete existing grocery list for this week if exists
  DELETE FROM grocery_lists 
  WHERE user_id = v_user_id AND week_start = v_week_start;

  -- Insert the new grocery list
  INSERT INTO grocery_lists (user_id, weekly_menu_id, week_start, items, generated_at)
  VALUES (v_user_id, p_weekly_menu_id, v_week_start, COALESCE(to_jsonb(v_result), '[]'::jsonb), now())
  RETURNING id INTO v_grocery_list_id;

  RETURN COALESCE(v_result, ARRAY[]::jsonb[]);
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.generate_grocery_list(uuid) TO authenticated;