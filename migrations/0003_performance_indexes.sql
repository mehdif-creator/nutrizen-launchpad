-- Migration: Performance Indexes for Recipe Filtering
-- Purpose: Optimize menu generation queries
-- Date: 2025-01-23

-- =============================================================================
-- RECIPE FILTERING INDEXES
-- =============================================================================

-- Time-based filters (prep_time, total_time)
CREATE INDEX IF NOT EXISTS idx_recipes_prep_time 
ON public.recipes(prep_time_min) 
WHERE published = true;

CREATE INDEX IF NOT EXISTS idx_recipes_total_time 
ON public.recipes(total_time_min) 
WHERE published = true;

-- Calorie filtering
CREATE INDEX IF NOT EXISTS idx_recipes_calories 
ON public.recipes(calories_kcal) 
WHERE published = true;

-- Protein filtering
CREATE INDEX IF NOT EXISTS idx_recipes_proteins 
ON public.recipes(proteins_g) 
WHERE published = true;

-- Appliances filtering (GIN for array containment)
CREATE INDEX IF NOT EXISTS idx_recipes_appliances 
ON public.recipes USING GIN(appliances)
WHERE published = true;

-- Composite index for common filter combinations
CREATE INDEX IF NOT EXISTS idx_recipes_time_calories 
ON public.recipes(prep_time_min, total_time_min, calories_kcal) 
WHERE published = true;

-- =============================================================================
-- INGREDIENT EXCLUSION OPTIMIZATION
-- =============================================================================

-- Enable pg_trgm extension for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Trigram index for ingredient exclusion LIKE queries
CREATE INDEX IF NOT EXISTS idx_recipes_ingredients_text_trgm 
ON public.recipes USING GIN(ingredients_text gin_trgm_ops)
WHERE published = true AND ingredients_text IS NOT NULL;

-- =============================================================================
-- USER TABLES INDEXES
-- =============================================================================

-- user_weekly_menus already has idx_user_weekly_menus_user_week
-- Verify it exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_user_weekly_menus_user_week'
  ) THEN
    CREATE INDEX idx_user_weekly_menus_user_week 
    ON public.user_weekly_menus(user_id, week_start);
    RAISE NOTICE 'Created idx_user_weekly_menus_user_week';
  ELSE
    RAISE NOTICE '✓ idx_user_weekly_menus_user_week already exists';
  END IF;
END $$;

-- Index for fetching latest menu (used in dashboard)
CREATE INDEX IF NOT EXISTS idx_user_weekly_menus_latest 
ON public.user_weekly_menus(user_id, week_start DESC, created_at DESC);

-- =============================================================================
-- ANALYZE TABLES
-- =============================================================================

ANALYZE public.recipes;
ANALYZE public.preferences;
ANALYZE public.user_weekly_menus;

-- =============================================================================
-- INDEX USAGE VERIFICATION
-- =============================================================================

-- Create a function to check index usage
CREATE OR REPLACE FUNCTION public.check_index_usage(table_name text)
RETURNS TABLE(
  index_name text,
  index_size text,
  index_scans bigint,
  tuples_read bigint,
  tuples_fetched bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    indexrelname::text,
    pg_size_pretty(pg_relation_size(indexrelid)),
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
  FROM pg_stat_user_indexes
  WHERE schemaname = 'public' AND relname = table_name
  ORDER BY idx_scan DESC;
$$;

COMMENT ON FUNCTION public.check_index_usage IS 
  'Check index usage statistics for a given table. Call with: SELECT * FROM check_index_usage(''recipes'')';

-- =============================================================================
-- QUERY PLAN EXAMPLES
-- =============================================================================

-- Example query plan for menu generation
-- EXPLAIN ANALYZE
-- SELECT id, title, prep_time_min, total_time_min, calories_kcal
-- FROM recipes
-- WHERE published = true
--   AND prep_time_min <= 30
--   AND total_time_min <= 60
--   AND calories_kcal BETWEEN 300 AND 600
--   AND NOT ('airfryer' = ANY(appliances))
-- LIMIT 100;

RAISE NOTICE '✓ Performance indexes created successfully';
RAISE NOTICE 'To check index usage: SELECT * FROM check_index_usage(''recipes'')';
