-- ============================================================================
-- Migration: Fix Security Definer View (recipe_macros_v)
-- Purpose: Convert recipe_macros_v from SECURITY DEFINER to SECURITY INVOKER
-- Security Issue: ERROR level - View bypasses RLS by running with creator's privileges
-- ============================================================================

-- Fix the recipe_macros_v view to use SECURITY INVOKER
-- This ensures the view runs with the permissions of the querying user, not the creator
ALTER VIEW recipe_macros_v SET (security_invoker = true);

-- Verify the change
DO $$
DECLARE
  view_options text[];
BEGIN
  SELECT reloptions INTO view_options
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relname = 'recipe_macros_v' 
  AND n.nspname = 'public'
  AND c.relkind = 'v';
  
  IF 'security_invoker=true' = ANY(view_options) THEN
    RAISE NOTICE '✅ recipe_macros_v is now SECURITY INVOKER';
  ELSE
    RAISE WARNING '⚠️ recipe_macros_v security_invoker setting may not have applied correctly';
  END IF;
END $$;