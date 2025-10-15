-- Fix search path for calculate_user_level function
CREATE OR REPLACE FUNCTION public.calculate_user_level(points integer)
RETURNS text
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN points < 50 THEN 'Bronze'
    WHEN points < 150 THEN 'Silver'
    WHEN points < 300 THEN 'Gold'
    ELSE 'Platinum'
  END;
$$;