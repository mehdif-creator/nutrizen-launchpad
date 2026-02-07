-- Fix function search_path security warnings
-- unaccent is in the extensions schema

CREATE OR REPLACE FUNCTION public.norm_txt(input TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public, extensions
AS $$
  SELECT lower(trim(extensions.unaccent(coalesce(input, ''))))
$$;

CREATE OR REPLACE FUNCTION public.recipe_ingredient_keys(ingredients TEXT)
RETURNS TEXT[]
LANGUAGE plpgsql
STABLE
SET search_path = public, extensions
AS $$
DECLARE
  normalized TEXT;
  keys TEXT[];
BEGIN
  -- Normalize the input text
  normalized := public.norm_txt(ingredients);
  
  -- Find all matching dictionary keys
  SELECT COALESCE(array_agg(DISTINCT d.key), '{}'::TEXT[])
  INTO keys
  FROM public.restriction_dictionary d
  WHERE normalized LIKE '%' || public.norm_txt(d.pattern) || '%';
  
  RETURN keys;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_recipes_set_ingredient_keys()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
BEGIN
  NEW.ingredient_keys := public.recipe_ingredient_keys(COALESCE(NEW.ingredients_text, ''));
  RETURN NEW;
END;
$$;

-- Also fix any other functions that were created without search_path
CREATE OR REPLACE FUNCTION public.set_recipe_image_url()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF new.image_path IS NOT NULL AND new.image_path <> '' THEN
    new.image_url :=
      'https://pghdaozgxkbtsxwydemd.supabase.co/storage/v1/object/public/recipes/' || new.image_path;
  END IF;
  RETURN new;
END;
$$;