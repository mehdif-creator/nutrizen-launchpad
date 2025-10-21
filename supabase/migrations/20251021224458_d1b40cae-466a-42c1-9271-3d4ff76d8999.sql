-- Fix the last remaining functions without search_path
-- These are the overloaded refresh_one_recipe functions

ALTER FUNCTION public.refresh_one_recipe(p_recipe_id bigint) SET search_path TO 'public';
ALTER FUNCTION public.refresh_one_recipe(p_recipe_id uuid) SET search_path TO 'public';