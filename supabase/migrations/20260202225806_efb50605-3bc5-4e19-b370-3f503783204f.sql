-- Security Hardening: Fix remaining functions without search_path
-- =====================================================================

-- Fix compute_recipe_macros
ALTER FUNCTION public.compute_recipe_macros(uuid) SET search_path = public;

-- Fix process_recipe_macros_queue
ALTER FUNCTION public.process_recipe_macros_queue(integer) SET search_path = public;