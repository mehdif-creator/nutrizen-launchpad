-- ============================================================
-- ALLERGEN SAFETY: Restriction Dictionary + Recipe Ingredient Keys
-- ============================================================

-- 1) Create the restriction_dictionary table for synonym mapping
CREATE TABLE IF NOT EXISTS public.restriction_dictionary (
  id BIGSERIAL PRIMARY KEY,
  key TEXT NOT NULL,           -- canonical key, e.g. 'pork'
  pattern TEXT NOT NULL,       -- term/synonym to match, e.g. 'jambon'
  kind TEXT NOT NULL DEFAULT 'ingredient',  -- 'ingredient' | 'allergen' | 'avoid'
  priority INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_restriction_dictionary_key ON public.restriction_dictionary(key);
CREATE INDEX IF NOT EXISTS idx_restriction_dictionary_pattern ON public.restriction_dictionary(pattern);
CREATE INDEX IF NOT EXISTS idx_restriction_dictionary_pattern_lower ON public.restriction_dictionary(lower(pattern));

-- 2) Seed: Comprehensive pork patterns (French terms)
INSERT INTO public.restriction_dictionary (key, pattern, kind, priority) VALUES
-- Main pork terms
('pork', 'porc', 'ingredient', 10),
('pork', 'porcine', 'ingredient', 10),
('pork', 'cochon', 'ingredient', 10),
-- Ham variants
('pork', 'jambon', 'ingredient', 10),
('pork', 'jambon blanc', 'ingredient', 10),
('pork', 'jambon cru', 'ingredient', 10),
('pork', 'jambon fumé', 'ingredient', 10),
('pork', 'jambon sec', 'ingredient', 10),
-- Lard/bacon
('pork', 'lard', 'ingredient', 10),
('pork', 'lardon', 'ingredient', 10),
('pork', 'lardons', 'ingredient', 10),
('pork', 'poitrine fumée', 'ingredient', 10),
('pork', 'poitrine de porc', 'ingredient', 10),
('pork', 'bacon', 'ingredient', 10),
('pork', 'pancetta', 'ingredient', 9),
('pork', 'guanciale', 'ingredient', 9),
-- Italian cured
('pork', 'prosciutto', 'ingredient', 9),
('pork', 'speck', 'ingredient', 9),
('pork', 'coppa', 'ingredient', 9),
-- Sausages
('pork', 'saucisson', 'ingredient', 9),
('pork', 'saucisse', 'ingredient', 9),
('pork', 'saucisses', 'ingredient', 9),
('pork', 'chipolata', 'ingredient', 9),
('pork', 'merguez', 'ingredient', 8),
('pork', 'andouille', 'ingredient', 9),
('pork', 'andouillette', 'ingredient', 9),
('pork', 'boudin', 'ingredient', 9),
('pork', 'boudin noir', 'ingredient', 9),
('pork', 'boudin blanc', 'ingredient', 9),
('pork', 'cervelas', 'ingredient', 9),
('pork', 'chorizo', 'ingredient', 8),
('pork', 'mortadelle', 'ingredient', 9),
-- Pâté/spreads
('pork', 'pâté', 'ingredient', 9),
('pork', 'pate', 'ingredient', 9),
('pork', 'rillettes', 'ingredient', 9),
('pork', 'terrine', 'ingredient', 8),
('pork', 'mousse de foie', 'ingredient', 8),
-- Cuts
('pork', 'échine', 'ingredient', 9),
('pork', 'echine', 'ingredient', 9),
('pork', 'filet mignon de porc', 'ingredient', 10),
('pork', 'côte de porc', 'ingredient', 10),
('pork', 'côtes de porc', 'ingredient', 10),
('pork', 'rôti de porc', 'ingredient', 10),
('pork', 'travers de porc', 'ingredient', 10),
('pork', 'jarret de porc', 'ingredient', 10),
('pork', 'épaule de porc', 'ingredient', 10),

-- Common allergens: Gluten
('gluten', 'gluten', 'allergen', 10),
('gluten', 'blé', 'allergen', 9),
('gluten', 'ble', 'allergen', 9),
('gluten', 'froment', 'allergen', 9),
('gluten', 'seigle', 'allergen', 9),
('gluten', 'orge', 'allergen', 9),
('gluten', 'épeautre', 'allergen', 9),
('gluten', 'kamut', 'allergen', 9),

-- Common allergens: Dairy
('dairy', 'lait', 'allergen', 10),
('dairy', 'lactose', 'allergen', 10),
('dairy', 'fromage', 'allergen', 9),
('dairy', 'crème', 'allergen', 9),
('dairy', 'creme', 'allergen', 9),
('dairy', 'beurre', 'allergen', 9),
('dairy', 'yaourt', 'allergen', 9),
('dairy', 'yogourt', 'allergen', 9),
('dairy', 'mascarpone', 'allergen', 9),
('dairy', 'mozzarella', 'allergen', 9),
('dairy', 'gruyère', 'allergen', 9),
('dairy', 'gruyere', 'allergen', 9),
('dairy', 'emmental', 'allergen', 9),
('dairy', 'parmesan', 'allergen', 9),
('dairy', 'comté', 'allergen', 9),
('dairy', 'comte', 'allergen', 9),

-- Nuts
('nuts', 'noix', 'allergen', 10),
('nuts', 'noisette', 'allergen', 10),
('nuts', 'amande', 'allergen', 10),
('nuts', 'cajou', 'allergen', 10),
('nuts', 'pistache', 'allergen', 10),
('nuts', 'macadamia', 'allergen', 10),
('nuts', 'pécan', 'allergen', 10),
('nuts', 'pecan', 'allergen', 10),

-- Peanuts
('peanuts', 'arachide', 'allergen', 10),
('peanuts', 'cacahuète', 'allergen', 10),
('peanuts', 'cacahuete', 'allergen', 10),
('peanuts', 'cacahouète', 'allergen', 10),

-- Eggs
('eggs', 'œuf', 'allergen', 10),
('eggs', 'oeuf', 'allergen', 10),
('eggs', 'œufs', 'allergen', 10),
('eggs', 'oeufs', 'allergen', 10),

-- Shellfish/Seafood
('shellfish', 'crustacé', 'allergen', 10),
('shellfish', 'crustace', 'allergen', 10),
('shellfish', 'crevette', 'allergen', 10),
('shellfish', 'homard', 'allergen', 10),
('shellfish', 'crabe', 'allergen', 10),
('shellfish', 'langouste', 'allergen', 10),
('shellfish', 'langoustine', 'allergen', 10),
('shellfish', 'moule', 'allergen', 10),
('shellfish', 'huître', 'allergen', 10),
('shellfish', 'huitre', 'allergen', 10),
('shellfish', 'coquillage', 'allergen', 10),

-- Fish
('fish', 'poisson', 'allergen', 10),
('fish', 'saumon', 'allergen', 9),
('fish', 'thon', 'allergen', 9),
('fish', 'cabillaud', 'allergen', 9),
('fish', 'merlu', 'allergen', 9),
('fish', 'sardine', 'allergen', 9),
('fish', 'anchois', 'allergen', 9),
('fish', 'maquereau', 'allergen', 9),

-- Soy
('soy', 'soja', 'allergen', 10),
('soy', 'tofu', 'allergen', 9),
('soy', 'tempeh', 'allergen', 9),
('soy', 'edamame', 'allergen', 9),

-- Sesame
('sesame', 'sésame', 'allergen', 10),
('sesame', 'sesame', 'allergen', 10),
('sesame', 'tahini', 'allergen', 9),
('sesame', 'tahin', 'allergen', 9),

-- Beef (for those who avoid it)
('beef', 'bœuf', 'ingredient', 10),
('beef', 'boeuf', 'ingredient', 10),
('beef', 'veau', 'ingredient', 9),
('beef', 'steak', 'ingredient', 9),
('beef', 'entrecôte', 'ingredient', 9),
('beef', 'bavette', 'ingredient', 9),
('beef', 'rumsteck', 'ingredient', 9)
ON CONFLICT DO NOTHING;

-- 3) Add ingredient_keys column to recipes table
ALTER TABLE public.recipes 
ADD COLUMN IF NOT EXISTS ingredient_keys TEXT[] DEFAULT '{}'::TEXT[];

-- 4) Create normalization function (uses existing unaccent extension)
CREATE OR REPLACE FUNCTION public.norm_txt(input TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(trim(unaccent(coalesce(input, ''))))
$$;

-- 5) Create function to extract ingredient keys from recipe text
CREATE OR REPLACE FUNCTION public.recipe_ingredient_keys(ingredients TEXT)
RETURNS TEXT[]
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  normalized TEXT;
  keys TEXT[];
BEGIN
  -- Normalize the input text
  normalized := public.norm_txt(ingredients);
  
  -- Find all matching dictionary keys
  SELECT COALESCE(array_agg(DISTINCT d.key), '{}'::TEXT[])
  INTO keys
  FROM public.restriction_dictionary d
  WHERE normalized LIKE '%' || public.norm_txt(d.pattern) || '%';
  
  RETURN keys;
END;
$$;

-- 6) Create trigger to auto-populate ingredient_keys on recipe insert/update
CREATE OR REPLACE FUNCTION public.trg_recipes_set_ingredient_keys()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.ingredient_keys := public.recipe_ingredient_keys(COALESCE(NEW.ingredients_text, ''));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recipes_set_ingredient_keys ON public.recipes;
CREATE TRIGGER trg_recipes_set_ingredient_keys
BEFORE INSERT OR UPDATE OF ingredients_text ON public.recipes
FOR EACH ROW 
EXECUTE FUNCTION public.trg_recipes_set_ingredient_keys();

-- 7) Backfill all existing recipes with ingredient_keys
UPDATE public.recipes
SET ingredient_keys = public.recipe_ingredient_keys(COALESCE(ingredients_text, ''))
WHERE ingredient_keys = '{}'::TEXT[] 
   OR ingredient_keys IS NULL 
   OR array_length(ingredient_keys, 1) IS NULL;

-- 8) Create menu_safety_reports table for user feedback
CREATE TABLE IF NOT EXISTS public.menu_safety_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  recipe_id UUID NOT NULL,
  menu_id UUID,
  reason TEXT NOT NULL,
  detected_violations TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_menu_safety_reports_user ON public.menu_safety_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_menu_safety_reports_recipe ON public.menu_safety_reports(recipe_id);

-- Enable RLS
ALTER TABLE public.menu_safety_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own safety reports"
ON public.menu_safety_reports
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own safety reports"
ON public.menu_safety_reports
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all safety reports"
ON public.menu_safety_reports
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable RLS on restriction_dictionary (public read, admin write)
ALTER TABLE public.restriction_dictionary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read restriction dictionary"
ON public.restriction_dictionary
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage restriction dictionary"
ON public.restriction_dictionary
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));