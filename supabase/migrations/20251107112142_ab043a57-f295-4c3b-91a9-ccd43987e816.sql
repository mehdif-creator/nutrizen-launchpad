-- ============================================
-- Security Fix: Move Extensions from Public Schema
-- ============================================
-- This migration addresses Supabase linter warnings:
-- 1. Extension in Public (pg_trgm, unaccent)
-- 2. Function Search Path Mutable (for extension functions)
--
-- By moving extensions to the 'extensions' schema, their functions
-- will be properly namespaced and the search_path warnings will resolve.

-- Create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Grant usage to necessary roles
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- Move pg_trgm extension to extensions schema
ALTER EXTENSION pg_trgm SET SCHEMA extensions;

-- Move unaccent extension to extensions schema  
ALTER EXTENSION unaccent SET SCHEMA extensions;

-- Add search_path to user-defined SECURITY INVOKER functions for best practice
-- Even though they're not SECURITY DEFINER, setting search_path improves consistency

ALTER FUNCTION public.canonicalize_name(text) SET search_path = public;
ALTER FUNCTION public.extract_name(text) SET search_path = public;
ALTER FUNCTION public.extract_qty_g(text) SET search_path = public;
ALTER FUNCTION public.get_shopping_list_from_menu_enriched_flat(jsonb, text[], text[], integer, integer) SET search_path = public;
ALTER FUNCTION public.get_shopping_list_from_menu_enriched_grouped(jsonb, text[], text[], integer, integer) SET search_path = public;

-- Note: get_menu_household has multiple signatures, handle both
ALTER FUNCTION public.get_menu_household(jsonb, integer, text, numeric, numeric, numeric, text[]) SET search_path = public;
ALTER FUNCTION public.get_menu_household(integer, jsonb, text, numeric, numeric, numeric, text[]) SET search_path = public;

-- Verify the changes
DO $$
BEGIN
  -- Check that extensions are in the extensions schema
  IF NOT EXISTS (
    SELECT 1 FROM pg_extension e
    JOIN pg_namespace n ON e.extnamespace = n.oid
    WHERE n.nspname = 'extensions' AND e.extname IN ('pg_trgm', 'unaccent')
  ) THEN
    RAISE EXCEPTION 'Extensions were not moved to extensions schema';
  END IF;

  RAISE NOTICE '✅ Extensions successfully moved to extensions schema';
  RAISE NOTICE '✅ Function search_path settings added for user functions';
END $$;