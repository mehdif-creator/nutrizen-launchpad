-- Add used_fallback column to track which fallback level was used
ALTER TABLE public.user_weekly_menus 
ADD COLUMN IF NOT EXISTS used_fallback text NULL;

COMMENT ON COLUMN public.user_weekly_menus.used_fallback IS 'Tracks which fallback level was used: null (none), F1, F2, F3, F4';

-- Add index for ingredients_text if not exists
CREATE INDEX IF NOT EXISTS idx_recipes_ingredients_text_gin 
ON public.recipes USING gin(to_tsvector('french', coalesce(ingredients_text, '')));

-- Add composite index for common filters
CREATE INDEX IF NOT EXISTS idx_recipes_filters 
ON public.recipes(published, prep_time_min, total_time_min, calories_kcal, proteins_g) 
WHERE published = true;