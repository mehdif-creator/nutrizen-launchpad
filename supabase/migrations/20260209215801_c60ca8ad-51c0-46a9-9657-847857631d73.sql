
-- Fix recipe_ingredient_keys to use extensions.unaccent
CREATE OR REPLACE FUNCTION public.recipe_ingredient_keys(r public.recipes)
RETURNS text[]
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  raw text := '';
  k text[];
BEGIN
  -- Build raw text from ALL available ingredient sources
  raw := COALESCE(r.ingredients_text, '');
  
  -- ingredients (jsonb array)
  IF r.ingredients IS NOT NULL AND r.ingredients != 'null'::jsonb THEN
    BEGIN
      raw := raw || ' ' || COALESCE(
        (SELECT string_agg(
          COALESCE(elem->>'name', '') || ' ' || 
          COALESCE(elem->>'ingredient', '') || ' ' || 
          COALESCE(elem->>'raw', '') || ' ' ||
          COALESCE(elem::text, ''),
          ' '
        )
        FROM jsonb_array_elements(r.ingredients) AS elem),
        ''
      );
    EXCEPTION WHEN OTHERS THEN
      -- ingredients might not be an array, try as text
      raw := raw || ' ' || COALESCE(r.ingredients::text, '');
    END;
  END IF;
  
  -- allergens array
  IF r.allergens IS NOT NULL THEN
    raw := raw || ' ' || array_to_string(r.allergens, ' ');
  END IF;
  
  -- Title
  raw := raw || ' ' || COALESCE(r.title, '');
  
  -- Normalize: lowercase + unaccent (using extensions schema)
  raw := lower(trim(extensions.unaccent(raw)));
  
  -- Match against dictionary patterns
  SELECT COALESCE(array_agg(DISTINCT d.key), '{}'::text[])
  INTO k
  FROM public.restriction_dictionary d
  WHERE raw LIKE '%' || lower(trim(extensions.unaccent(d.pattern))) || '%';
  
  RETURN k;
END;
$$;

-- Backfill ALL published recipes with the improved tagger
UPDATE public.recipes r
SET ingredient_keys = public.recipe_ingredient_keys(r)
WHERE published = true;
