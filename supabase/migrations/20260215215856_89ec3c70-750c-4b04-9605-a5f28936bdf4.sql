-- Convert calculate_user_level to SECURITY INVOKER
-- This is a pure IMMUTABLE function with no table access, so DEFINER is unnecessary
CREATE OR REPLACE FUNCTION public.calculate_user_level(points integer)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN points < 50 THEN 'Bronze'
    WHEN points < 150 THEN 'Silver'
    WHEN points < 300 THEN 'Gold'
    ELSE 'Platinum'
  END;
$function$;