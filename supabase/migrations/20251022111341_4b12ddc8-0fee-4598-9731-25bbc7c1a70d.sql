-- Add new filtering columns to recipes table for NutriZen onboarding alignment
-- All columns are nullable to not break existing data

-- Goal and calorie targeting
ALTER TABLE public.recipes
ADD COLUMN IF NOT EXISTS goal_tags text[],
ADD COLUMN IF NOT EXISTS calorie_target text;

-- Recipe difficulty and allergens
ALTER TABLE public.recipes
ADD COLUMN IF NOT EXISTS difficulty_level text,
ADD COLUMN IF NOT EXISTS allergens text[];

-- Diet and cuisine preferences
ALTER TABLE public.recipes
ADD COLUMN IF NOT EXISTS diet_type text,
ADD COLUMN IF NOT EXISTS cuisine_type text;

-- Cooking methods and ingredients
ALTER TABLE public.recipes
ADD COLUMN IF NOT EXISTS cooking_method text[],
ADD COLUMN IF NOT EXISTS main_ingredients text[],
ADD COLUMN IF NOT EXISTS excluded_ingredients text[],
ADD COLUMN IF NOT EXISTS ingredient_keywords text[];

-- Taste preferences
ALTER TABLE public.recipes
ADD COLUMN IF NOT EXISTS spice_level text,
ADD COLUMN IF NOT EXISTS salt_level text,
ADD COLUMN IF NOT EXISTS sugar_level text;

-- Meal timing and logistics
ALTER TABLE public.recipes
ADD COLUMN IF NOT EXISTS meal_type text,
ADD COLUMN IF NOT EXISTS batch_cooking_friendly boolean,
ADD COLUMN IF NOT EXISTS portable boolean;

-- Equipment and AI metadata
ALTER TABLE public.recipes
ADD COLUMN IF NOT EXISTS equipment_needed text[],
ADD COLUMN IF NOT EXISTS ai_keywords text[],
ADD COLUMN IF NOT EXISTS rating float;

-- Create GIN indexes on text[] columns for fast filtering
CREATE INDEX IF NOT EXISTS idx_recipes_goal_tags ON public.recipes USING GIN (goal_tags);
CREATE INDEX IF NOT EXISTS idx_recipes_allergens ON public.recipes USING GIN (allergens);
CREATE INDEX IF NOT EXISTS idx_recipes_cooking_method ON public.recipes USING GIN (cooking_method);
CREATE INDEX IF NOT EXISTS idx_recipes_main_ingredients ON public.recipes USING GIN (main_ingredients);
CREATE INDEX IF NOT EXISTS idx_recipes_excluded_ingredients ON public.recipes USING GIN (excluded_ingredients);
CREATE INDEX IF NOT EXISTS idx_recipes_ingredient_keywords ON public.recipes USING GIN (ingredient_keywords);
CREATE INDEX IF NOT EXISTS idx_recipes_equipment_needed ON public.recipes USING GIN (equipment_needed);
CREATE INDEX IF NOT EXISTS idx_recipes_ai_keywords ON public.recipes USING GIN (ai_keywords);

-- Create indexes on commonly filtered text columns
CREATE INDEX IF NOT EXISTS idx_recipes_difficulty_level ON public.recipes (difficulty_level);
CREATE INDEX IF NOT EXISTS idx_recipes_diet_type ON public.recipes (diet_type);
CREATE INDEX IF NOT EXISTS idx_recipes_cuisine_type ON public.recipes (cuisine_type);
CREATE INDEX IF NOT EXISTS idx_recipes_meal_type ON public.recipes (meal_type);
CREATE INDEX IF NOT EXISTS idx_recipes_calorie_target ON public.recipes (calorie_target);

-- Comment on table for documentation
COMMENT ON COLUMN public.recipes.goal_tags IS 'Related goals: weight_loss, muscle_gain, energy, balance, pregnancy';
COMMENT ON COLUMN public.recipes.calorie_target IS 'Calorie target: deficit, maintenance, surplus';
COMMENT ON COLUMN public.recipes.difficulty_level IS 'Cooking difficulty: beginner, intermediate, expert';
COMMENT ON COLUMN public.recipes.allergens IS 'Allergens contained: gluten, lactose, nuts, etc.';
COMMENT ON COLUMN public.recipes.diet_type IS 'Diet type: omnivore, vegetarian, vegan, pescatarian, keto, etc.';
COMMENT ON COLUMN public.recipes.cuisine_type IS 'Cuisine style: italian, french, asian, mexican, mediterranean, etc.';
COMMENT ON COLUMN public.recipes.cooking_method IS 'Cooking techniques: grilled, baked, steamed, raw, etc.';
COMMENT ON COLUMN public.recipes.main_ingredients IS 'Key ingredients in the recipe';
COMMENT ON COLUMN public.recipes.excluded_ingredients IS 'Ingredients that are not present';
COMMENT ON COLUMN public.recipes.ingredient_keywords IS 'Nutrition tags: high_protein, low_carb, high_fiber, etc.';
COMMENT ON COLUMN public.recipes.spice_level IS 'Spice intensity: none, mild, medium, hot';
COMMENT ON COLUMN public.recipes.salt_level IS 'Salt level: low, normal, no_salt';
COMMENT ON COLUMN public.recipes.sugar_level IS 'Sugar level: low, normal';
COMMENT ON COLUMN public.recipes.meal_type IS 'Meal category: breakfast, lunch, dinner, snack';
COMMENT ON COLUMN public.recipes.batch_cooking_friendly IS 'True if suitable for batch cooking';
COMMENT ON COLUMN public.recipes.portable IS 'True if easy to take away';
COMMENT ON COLUMN public.recipes.equipment_needed IS 'Kitchen tools required: oven, blender, air_fryer, etc.';
COMMENT ON COLUMN public.recipes.ai_keywords IS 'Additional AI-generated tags: healthy, budget, quick, etc.';
COMMENT ON COLUMN public.recipes.rating IS 'Recipe rating (0-5)';