-- Set search_path on parse_ingredient_line (IMMUTABLE, no table access, but linter requires it)
ALTER FUNCTION public.parse_ingredient_line(text) SET search_path = public;