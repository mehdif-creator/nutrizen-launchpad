
-- Feature 1: recipe_favorites
CREATE TABLE IF NOT EXISTS public.recipe_favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recipe_id UUID REFERENCES public.recipes(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, recipe_id)
);
ALTER TABLE public.recipe_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own favorites" ON public.recipe_favorites
  FOR ALL USING (auth.uid() = user_id);

-- Feature 3: week_number on meal_plans
ALTER TABLE public.meal_plans ADD COLUMN IF NOT EXISTS week_number INTEGER DEFAULT 1;

-- Feature 4: user_foods
CREATE TABLE IF NOT EXISTS public.user_foods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  barcode TEXT,
  name TEXT NOT NULL,
  brand TEXT,
  calories_per_100g NUMERIC,
  proteins_per_100g NUMERIC,
  carbs_per_100g NUMERIC,
  fats_per_100g NUMERIC,
  nutriscore TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.user_foods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own foods" ON public.user_foods
  FOR ALL USING (auth.uid() = user_id);

-- Feature 4: Add scan_barcode to feature_costs
INSERT INTO public.feature_costs (feature, cost, description)
VALUES ('scan_barcode', 1, 'Scan code-barres produit')
ON CONFLICT (feature) DO NOTHING;
