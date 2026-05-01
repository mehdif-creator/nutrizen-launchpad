-- 1) cooking_method: text -> text[]
ALTER TABLE public.user_food_style
  ALTER COLUMN cooking_method TYPE text[]
  USING CASE
    WHEN cooking_method IS NULL OR cooking_method = '' THEN NULL
    ELSE ARRAY[cooking_method]
  END;

-- 2) Add salt_level on user_food_style
ALTER TABLE public.user_food_style
  ADD COLUMN IF NOT EXISTS salt_level text;

-- 3) Add protein_g_per_kg on user_nutrition_goals
ALTER TABLE public.user_nutrition_goals
  ADD COLUMN IF NOT EXISTS protein_g_per_kg numeric;

-- 4) Helpful index for candidate recipe fetch
CREATE INDEX IF NOT EXISTS idx_recipes_diet_published
  ON public.recipes(diet_type, published)
  WHERE published = true;