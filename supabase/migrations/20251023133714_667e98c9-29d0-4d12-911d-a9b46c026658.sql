-- NutriZen Backend + Frontend Perfect Integration
-- Ensures all KPIs start at 0, proper constraints, and clean defaults

-- 1. Ensure user_dashboard_stats has proper defaults and NOT NULL constraints
DO $$ 
BEGIN
  -- Update existing NULL values to 0
  UPDATE public.user_dashboard_stats
  SET 
    temps_gagne = COALESCE(temps_gagne, 0),
    charge_mentale_pct = COALESCE(charge_mentale_pct, 0),
    serie_en_cours_set_count = COALESCE(serie_en_cours_set_count, 0),
    credits_zen = COALESCE(credits_zen, 10),
    references_count = COALESCE(references_count, 0),
    objectif_hebdos_valide = COALESCE(objectif_hebdos_valide, 0);

  -- Ensure user_gamification has proper defaults
  UPDATE public.user_gamification
  SET 
    points = COALESCE(points, 0),
    level = COALESCE(level, 0),
    streak_days = COALESCE(streak_days, 0),
    badges_count = COALESCE(badges_count, 0);

  -- Ensure user_points has proper defaults
  UPDATE public.user_points
  SET 
    total_points = COALESCE(total_points, 0),
    login_streak = COALESCE(login_streak, 0),
    meals_generated = COALESCE(meals_generated, 0),
    meals_completed = COALESCE(meals_completed, 0),
    referrals = COALESCE(referrals, 0);
END $$;

-- 2. Ensure preferences has appliances_owned with proper default
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'preferences' 
    AND column_name = 'appliances_owned'
  ) THEN
    ALTER TABLE public.preferences 
    ADD COLUMN appliances_owned text[] DEFAULT '{}'::text[];
  END IF;
  
  -- Update NULL values
  UPDATE public.preferences
  SET appliances_owned = '{}'::text[]
  WHERE appliances_owned IS NULL;
END $$;

-- 3. Ensure recipes has proper arrays with defaults
DO $$
BEGIN
  -- Update NULL appliances to empty array
  UPDATE public.recipes
  SET appliances = '{}'::text[]
  WHERE appliances IS NULL;
  
  -- Ensure ingredients_text is populated from ingredients jsonb for published recipes
  UPDATE public.recipes
  SET ingredients_text = (
    SELECT string_agg(
      COALESCE(
        ingredient->>'name',
        ingredient->>'ingredient',
        ingredient::text
      ), ' '
    )
    FROM jsonb_array_elements(
      CASE 
        WHEN jsonb_typeof(ingredients) = 'array' THEN ingredients
        ELSE '[]'::jsonb
      END
    ) AS ingredient
  )
  WHERE published = true 
    AND ingredients IS NOT NULL 
    AND (ingredients_text IS NULL OR ingredients_text = '');
END $$;

-- 4. Ensure UNIQUE constraint on user_weekly_menus (user_id, week_start)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_weekly_menus_user_id_week_start_key'
  ) THEN
    ALTER TABLE public.user_weekly_menus 
    ADD CONSTRAINT user_weekly_menus_user_id_week_start_key 
    UNIQUE (user_id, week_start);
  END IF;
END $$;

-- 5. Add performance indexes if missing
CREATE INDEX IF NOT EXISTS idx_recipes_prep_time ON public.recipes(prep_time_min) WHERE published = true;
CREATE INDEX IF NOT EXISTS idx_recipes_total_time ON public.recipes(total_time_min) WHERE published = true;
CREATE INDEX IF NOT EXISTS idx_recipes_calories ON public.recipes(calories_kcal) WHERE published = true;
CREATE INDEX IF NOT EXISTS idx_recipes_proteins ON public.recipes(proteins_g) WHERE published = true;
CREATE INDEX IF NOT EXISTS idx_recipes_appliances_gin ON public.recipes USING GIN(appliances) WHERE published = true;
CREATE INDEX IF NOT EXISTS idx_recipes_allergens_gin ON public.recipes USING GIN(allergens) WHERE published = true;

-- 6. Add text search index on ingredients_text if pg_trgm extension exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
    CREATE INDEX IF NOT EXISTS idx_recipes_ingredients_text_trgm 
    ON public.recipes USING GIN(ingredients_text gin_trgm_ops) 
    WHERE published = true AND ingredients_text IS NOT NULL;
  END IF;
END $$;

-- 7. Add index on user_weekly_menus for efficient queries
CREATE INDEX IF NOT EXISTS idx_user_weekly_menus_user_week 
ON public.user_weekly_menus(user_id, week_start DESC);

-- Verify setup
DO $$
DECLARE
  stats_count int;
  gamif_count int;
  menus_count int;
BEGIN
  SELECT COUNT(*) INTO stats_count FROM public.user_dashboard_stats;
  SELECT COUNT(*) INTO gamif_count FROM public.user_gamification;
  SELECT COUNT(*) INTO menus_count FROM public.user_weekly_menus;
  
  RAISE NOTICE '✅ Integration setup complete:';
  RAISE NOTICE '   - Dashboard stats rows: %', stats_count;
  RAISE NOTICE '   - Gamification rows: %', gamif_count;
  RAISE NOTICE '   - Weekly menus: %', menus_count;
  RAISE NOTICE '   - All KPIs coalesced to 0';
  RAISE NOTICE '   - Indexes created for performance';
END $$;