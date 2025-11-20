-- ============================================================
-- INGREDIENT NORMALIZATION SYSTEM FOR SHOPPING LISTS
-- ============================================================
-- This migration implements a robust normalization pipeline to:
-- 1. Parse fractions (1/2, 1/4, 3/4) and comma decimals (0,5; 2,5)
-- 2. Normalize unit variants (c.à.s, cuillère à soupe → tbsp)
-- 3. Aggregate shopping list by (ingredient + canonical_unit)
-- ============================================================

-- ============================================================
-- 1. PARSE QUANTITY FROM TEXT (handles fractions and decimals)
-- ============================================================
CREATE OR REPLACE FUNCTION public.parse_quantity_text(raw_text text)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  cleaned text;
  parts text[];
  numerator numeric;
  denominator numeric;
BEGIN
  IF raw_text IS NULL OR trim(raw_text) = '' THEN
    RETURN NULL;
  END IF;

  -- Clean the text: remove extra spaces
  cleaned := regexp_replace(trim(raw_text), '\s+', ' ', 'g');
  
  -- Replace comma with dot for decimals (French format: 0,5 → 0.5)
  cleaned := replace(cleaned, ',', '.');
  
  -- Case 1: Simple fraction like "1/2", "1/4", "3/4"
  IF cleaned ~ '^\d+/\d+$' THEN
    parts := regexp_split_to_array(cleaned, '/');
    numerator := parts[1]::numeric;
    denominator := parts[2]::numeric;
    IF denominator = 0 THEN
      RETURN NULL;
    END IF;
    RETURN numerator / denominator;
  END IF;
  
  -- Case 2: Mixed number like "1 1/2" (integer + space + fraction)
  IF cleaned ~ '^\d+\s+\d+/\d+$' THEN
    parts := regexp_split_to_array(cleaned, '\s+');
    numerator := parts[1]::numeric; -- whole part
    -- Parse the fraction part
    parts := regexp_split_to_array(parts[2], '/');
    denominator := parts[2]::numeric;
    IF denominator = 0 THEN
      RETURN NULL;
    END IF;
    RETURN numerator + (parts[1]::numeric / denominator);
  END IF;
  
  -- Case 3: Simple decimal or integer (e.g., "1", "2.5", "0.5")
  IF cleaned ~ '^\d+\.?\d*$' THEN
    RETURN cleaned::numeric;
  END IF;
  
  -- Case 4: Extract first number if text contains other characters
  -- This handles cases like "200 g" → extract "200"
  cleaned := regexp_replace(cleaned, '[^\d\./]', ' ', 'g');
  cleaned := trim(regexp_replace(cleaned, '\s+', ' ', 'g'));
  
  IF cleaned ~ '^\d+/\d+$' THEN
    parts := regexp_split_to_array(cleaned, '/');
    numerator := parts[1]::numeric;
    denominator := parts[2]::numeric;
    IF denominator = 0 THEN
      RETURN NULL;
    END IF;
    RETURN numerator / denominator;
  END IF;
  
  IF cleaned ~ '^\d+\.?\d*' THEN
    RETURN substring(cleaned from '^\d+\.?\d*')::numeric;
  END IF;
  
  RETURN NULL;
END;
$$;

-- ============================================================
-- 2. NORMALIZE UNIT (maps variants to canonical units)
-- ============================================================
CREATE OR REPLACE FUNCTION public.normalize_unit(raw_unit text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  cleaned text;
BEGIN
  IF raw_unit IS NULL THEN
    RETURN 'piece';
  END IF;
  
  -- Clean and lowercase
  cleaned := lower(trim(raw_unit));
  cleaned := regexp_replace(cleaned, '\s+', ' ', 'g');
  
  -- Remove dots and accents for matching
  cleaned := replace(cleaned, '.', '');
  cleaned := replace(cleaned, 'à', 'a');
  cleaned := unaccent(cleaned);
  
  -- Tablespoon variants (cuillère à soupe)
  IF cleaned IN ('c a s', 'cas', 'c.a.s', 'càs', 'cuillerée à soupe', 'cuillère à soupe', 'cuilleree a soupe', 'cuillere a soupe', 'cuillère a soupe', 'cs', 'tbsp', 'tablespoon', 'soupe') THEN
    RETURN 'tbsp';
  END IF;
  
  -- Teaspoon variants (cuillère à café)
  IF cleaned IN ('c a c', 'cac', 'c.a.c', 'càc', 'cuillerée à café', 'cuillère à café', 'cuilleree a cafe', 'cuillere a cafe', 'cuillère a cafe', 'cc', 'tsp', 'teaspoon', 'cafe') THEN
    RETURN 'tsp';
  END IF;
  
  -- Grams
  IF cleaned IN ('g', 'gr', 'gramme', 'grammes', 'gram', 'grams') THEN
    RETURN 'g';
  END IF;
  
  -- Kilograms
  IF cleaned IN ('kg', 'kilo', 'kilogramme', 'kilogrammes') THEN
    RETURN 'kg';
  END IF;
  
  -- Milliliters
  IF cleaned IN ('ml', 'millilitre', 'millilitres', 'milliliter', 'milliliters') THEN
    RETURN 'ml';
  END IF;
  
  -- Centiliters
  IF cleaned IN ('cl', 'centilitre', 'centilitres') THEN
    RETURN 'cl';
  END IF;
  
  -- Liters
  IF cleaned IN ('l', 'litre', 'litres', 'liter', 'liters') THEN
    RETURN 'l';
  END IF;
  
  -- Pieces/units
  IF cleaned IN ('piece', 'pieces', 'pce', 'unite', 'unites', 'unité', 'unités', 'pc', 'pcs', 'tranche', 'tranches', 'morceau', 'morceaux', 'gousse', 'gousses', 'brin', 'brins', 'feuille', 'feuilles') THEN
    RETURN 'piece';
  END IF;
  
  -- Pinch
  IF cleaned IN ('pincee', 'pincée', 'pincees', 'pincées', 'pinch') THEN
    RETURN 'pinch';
  END IF;
  
  -- Bunch
  IF cleaned IN ('botte', 'bottes', 'bouquet', 'bouquets', 'bunch') THEN
    RETURN 'bunch';
  END IF;
  
  -- Package/sachet
  IF cleaned IN ('sachet', 'sachets', 'paquet', 'paquets', 'boite', 'boîte', 'boites', 'boîtes', 'package') THEN
    RETURN 'package';
  END IF;
  
  -- Default to piece for unknown units
  RETURN 'piece';
END;
$$;

-- ============================================================
-- 3. PARSE INGREDIENT LINE (extract quantity, unit, name)
-- ============================================================
CREATE OR REPLACE FUNCTION public.parse_ingredient_line(raw_line text)
RETURNS TABLE(
  quantity numeric,
  canonical_unit text,
  ingredient_name text
)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  qty_match text;
  unit_match text;
  name_part text;
  cleaned text;
BEGIN
  IF raw_line IS NULL OR trim(raw_line) = '' THEN
    RETURN;
  END IF;
  
  cleaned := trim(raw_line);
  
  -- Try to extract: quantity + unit + "de" + name
  -- Pattern: "200 g de pâtes" or "1/2 c.à.s d'huile" or "2 cuillères à soupe de sauce"
  
  -- Extract quantity at the start (number, fraction, or decimal)
  qty_match := substring(cleaned from '^(\d+[,\./]?\d*(\s+\d+/\d+)?)\s*');
  
  IF qty_match IS NOT NULL THEN
    quantity := public.parse_quantity_text(qty_match);
    -- Remove quantity from string
    cleaned := trim(substring(cleaned from length(qty_match) + 1));
  ELSE
    quantity := 1; -- default to 1 if no quantity found
  END IF;
  
  -- Extract unit (next word(s) before "de" or "d'")
  unit_match := substring(cleaned from '^([a-zA-Zàâäéèêëïîôùûüÿç\.\s]+?)\s+(de|d'')\s+');
  
  IF unit_match IS NOT NULL THEN
    canonical_unit := public.normalize_unit(unit_match);
    -- Remove unit and "de/d'" from string
    name_part := trim(regexp_replace(cleaned, '^[a-zA-Zàâäéèêëïîôùûüÿç\.\s]+?\s+(de|d'')\s+', ''));
  ELSE
    -- Try to extract unit without "de" (e.g., "200g pâtes")
    unit_match := substring(cleaned from '^([a-zA-Zàâäéèêëïîôùûüÿç\.]+)\s+');
    
    IF unit_match IS NOT NULL AND length(unit_match) < 20 THEN
      canonical_unit := public.normalize_unit(unit_match);
      name_part := trim(substring(cleaned from length(unit_match) + 1));
    ELSE
      -- No unit found, assume piece
      canonical_unit := 'piece';
      name_part := cleaned;
    END IF;
  END IF;
  
  ingredient_name := trim(name_part);
  
  RETURN NEXT;
END;
$$;

-- ============================================================
-- 4. ADD COLUMNS TO recipe_ingredients FOR NORMALIZED DATA
-- ============================================================
-- Add columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'recipe_ingredients' 
                 AND column_name = 'canonical_unit') THEN
    ALTER TABLE public.recipe_ingredients 
    ADD COLUMN canonical_unit text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'recipe_ingredients' 
                 AND column_name = 'normalized_quantity') THEN
    ALTER TABLE public.recipe_ingredients 
    ADD COLUMN normalized_quantity numeric;
  END IF;
END $$;

-- ============================================================
-- 5. BACKFILL NORMALIZED DATA FOR EXISTING INGREDIENTS
-- ============================================================
-- This updates existing recipe_ingredients with normalized values
-- Run this once for existing data
UPDATE public.recipe_ingredients
SET 
  normalized_quantity = COALESCE(
    (SELECT p.quantity FROM public.parse_ingredient_line(ingredient_line_raw) p LIMIT 1),
    quantity_g_num
  ),
  canonical_unit = COALESCE(
    (SELECT p.canonical_unit FROM public.parse_ingredient_line(ingredient_line_raw) p LIMIT 1),
    CASE 
      WHEN quantity_g IS NOT NULL AND quantity_g > 0 THEN 'g'
      ELSE 'piece'
    END
  )
WHERE ingredient_line_raw IS NOT NULL
  AND (canonical_unit IS NULL OR normalized_quantity IS NULL);

-- ============================================================
-- 6. CREATE VIEW FOR NORMALIZED INGREDIENTS
-- ============================================================
CREATE OR REPLACE VIEW public.recipe_ingredients_normalized AS
SELECT
  ri.id,
  ri.recipe_id,
  ri.ingredient_name,
  public.normalize_str(ri.ingredient_name) as normalized_name,
  COALESCE(ri.normalized_quantity, ri.quantity_g_num, 1) as quantity,
  COALESCE(ri.canonical_unit, 'g') as unit,
  ri.ingredient_line_raw
FROM public.recipe_ingredients ri;

-- ============================================================
-- 7. UPDATE SHOPPING LIST FUNCTION TO USE NORMALIZED DATA
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_shopping_list_normalized(
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
  
  -- Get ingredients from current week's menu, normalized and aggregated
  RETURN QUERY
  WITH menu_items AS (
    SELECT 
      uwmi.recipe_id,
      uwmi.portion_factor
    FROM public.user_weekly_menus uwm
    JOIN public.user_weekly_menu_items uwmi ON uwmi.weekly_menu_id = uwm.menu_id
    WHERE uwm.user_id = p_user_id
      AND uwm.week_start = v_week_start
  ),
  ingredients_with_portions AS (
    SELECT
      rin.normalized_name,
      rin.unit,
      rin.quantity * mi.portion_factor as scaled_quantity,
      rin.ingredient_name as display_name
    FROM menu_items mi
    JOIN public.recipe_ingredients_normalized rin ON rin.recipe_id = mi.recipe_id
  ),
  aggregated AS (
    SELECT
      normalized_name,
      unit,
      SUM(scaled_quantity) as total_qty,
      -- Pick the most common display name
      (array_agg(display_name ORDER BY display_name))[1] as display_name
    FROM ingredients_with_portions
    GROUP BY normalized_name, unit
  )
  SELECT
    display_name as ingredient_name,
    ROUND(total_qty, 1) as total_quantity,
    unit,
    -- Format for display
    CASE
      WHEN unit = 'tbsp' THEN ROUND(total_qty, 1) || ' c.à.s de ' || display_name
      WHEN unit = 'tsp' THEN ROUND(total_qty, 1) || ' c.à.c de ' || display_name
      WHEN unit = 'g' THEN ROUND(total_qty, 0) || ' g de ' || display_name
      WHEN unit = 'kg' THEN ROUND(total_qty, 2) || ' kg de ' || display_name
      WHEN unit = 'ml' THEN ROUND(total_qty, 0) || ' ml de ' || display_name
      WHEN unit = 'cl' THEN ROUND(total_qty, 1) || ' cl de ' || display_name
      WHEN unit = 'l' THEN ROUND(total_qty, 2) || ' l de ' || display_name
      WHEN unit = 'piece' THEN ROUND(total_qty, 0) || ' ' || display_name
      WHEN unit = 'pinch' THEN 'Une pincée de ' || display_name
      WHEN unit = 'bunch' THEN ROUND(total_qty, 0) || ' botte(s) de ' || display_name
      WHEN unit = 'package' THEN ROUND(total_qty, 0) || ' sachet(s) de ' || display_name
      ELSE ROUND(total_qty, 1) || ' ' || unit || ' de ' || display_name
    END as formatted_display
  FROM aggregated
  ORDER BY display_name;
END;
$$;

COMMENT ON FUNCTION public.parse_quantity_text IS 'Parses quantity from text, handling fractions (1/2, 3/4) and comma decimals (0,5)';
COMMENT ON FUNCTION public.normalize_unit IS 'Normalizes unit variants (c.à.s, cuillère à soupe) to canonical units (tbsp, tsp, g, ml, piece)';
COMMENT ON FUNCTION public.parse_ingredient_line IS 'Parses full ingredient line into quantity, unit, and name components';
COMMENT ON FUNCTION public.get_shopping_list_normalized IS 'Generates normalized shopping list with aggregated quantities by ingredient and unit';