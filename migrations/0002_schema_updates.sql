-- Migration: Schema Updates for NutriZen
-- Purpose: Ensure all required columns exist with proper defaults
-- Date: 2025-01-23

-- =============================================================================
-- RECIPES TABLE UPDATES
-- =============================================================================

-- Ensure appliances has proper default
ALTER TABLE public.recipes 
ALTER COLUMN appliances SET DEFAULT '{}'::text[];

-- Update existing NULL appliances to empty array
UPDATE public.recipes 
SET appliances = '{}'::text[]
WHERE appliances IS NULL;

-- Ensure ingredients_text is populated from ingredients jsonb
-- (This should already be done but included for completeness)
UPDATE public.recipes
SET ingredients_text = (
  SELECT string_agg(
    COALESCE(ing->>'name', ing->>'ingredient', ing::text), 
    ', '
  )
  FROM jsonb_array_elements(
    CASE 
      WHEN jsonb_typeof(ingredients) = 'array' THEN ingredients
      ELSE '[]'::jsonb
    END
  ) AS ing
)
WHERE ingredients IS NOT NULL 
  AND (ingredients_text IS NULL OR ingredients_text = '');

-- =============================================================================
-- PREFERENCES TABLE UPDATES
-- =============================================================================

-- Ensure appliances_owned exists (already added in previous migration)
-- Adding here for completeness
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
END $$;

-- Update existing NULL appliances_owned to empty array
UPDATE public.preferences 
SET appliances_owned = '{}'::text[]
WHERE appliances_owned IS NULL;

-- =============================================================================
-- USER_WEEKLY_MENUS CONSTRAINTS
-- =============================================================================

-- Ensure unique constraint exists (should already exist)
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

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON COLUMN public.recipes.appliances IS 
  'Required appliances for this recipe (e.g., airfryer, oven). Used for filtering based on user-owned appliances.';

COMMENT ON COLUMN public.recipes.ingredients_text IS 
  'Plain text concatenation of all ingredients for exclusion filtering. Auto-populated from ingredients jsonb.';

COMMENT ON COLUMN public.preferences.appliances_owned IS 
  'List of appliances the user owns. Recipes requiring appliances not in this list will be excluded.';

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Verify all recipes have appliances as array
DO $$
DECLARE
  null_count int;
BEGIN
  SELECT COUNT(*) INTO null_count
  FROM public.recipes
  WHERE appliances IS NULL;
  
  IF null_count > 0 THEN
    RAISE WARNING 'Found % recipes with NULL appliances', null_count;
  ELSE
    RAISE NOTICE '✓ All recipes have appliances array';
  END IF;
END $$;

-- Verify ingredients_text population
DO $$
DECLARE
  missing_count int;
BEGIN
  SELECT COUNT(*) INTO missing_count
  FROM public.recipes
  WHERE published = true 
    AND ingredients IS NOT NULL 
    AND (ingredients_text IS NULL OR ingredients_text = '');
  
  IF missing_count > 0 THEN
    RAISE WARNING 'Found % published recipes with missing ingredients_text', missing_count;
  ELSE
    RAISE NOTICE '✓ All published recipes have ingredients_text';
  END IF;
END $$;
