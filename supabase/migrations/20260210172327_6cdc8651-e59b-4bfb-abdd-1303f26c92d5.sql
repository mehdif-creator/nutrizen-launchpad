-- Fix mutable search_path on 5 public functions

CREATE OR REPLACE FUNCTION public.normalize_storage_path()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.image_path IS NOT NULL THEN
    NEW.image_path := regexp_replace(NEW.image_path, '^/+', '');
  END IF;
  RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS public.recipe_image_public_url(text);
CREATE OR REPLACE FUNCTION public.recipe_image_public_url(p_path text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN p_path IS NULL OR btrim(p_path) = '' THEN NULL
      ELSE
        'https://pghdaozgxkbtsxwydemd.supabase.co/storage/v1/object/public/recipe-images/' ||
        replace(
          regexp_replace(ltrim(p_path, '/'), '^recipe-images/', ''),
          ' ',
          '%20'
        )
    END;
$$;

CREATE OR REPLACE FUNCTION public.recipes_normalize_image_path()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.image_path IS NOT NULL THEN
    NEW.image_path := regexp_replace(NEW.image_path, '^/+', '');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.social_queue_autofill_image_path()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.image_path IS NULL AND NEW.recipe_id IS NOT NULL THEN
    SELECT image_path INTO NEW.image_path
    FROM public.recipes
    WHERE id = NEW.recipe_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_social_queue_from_recipe()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  UPDATE public.social_queue
  SET image_path = NEW.image_path
  WHERE recipe_id = NEW.id
    AND image_path IS DISTINCT FROM NEW.image_path;
  RETURN NEW;
END;
$$;