-- Fix security warning: Set search_path for function to prevent SQL injection
ALTER FUNCTION get_weekly_recipes_by_day(uuid, date) SET search_path = public, pg_temp;