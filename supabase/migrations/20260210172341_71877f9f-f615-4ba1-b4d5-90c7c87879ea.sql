DROP FUNCTION IF EXISTS public.normalize_storage_path(text);
CREATE OR REPLACE FUNCTION public.normalize_storage_path(p text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE s text := btrim(coalesce(p,''));
BEGIN
  IF s = '' THEN
    RETURN NULL;
  END IF;
  s := regexp_replace(s, '^/+', '');
  IF s ~* '^https?://' THEN
    s := regexp_replace(s, '^https?://[^/]+/storage/v1/object/public/', '');
  END IF;
  IF s LIKE 'recipe-images/%' THEN
    RETURN s;
  END IF;
  RETURN 'recipe-images/' || s;
END;
$$;