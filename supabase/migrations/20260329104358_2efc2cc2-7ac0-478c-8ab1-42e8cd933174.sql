-- Fix search_path on the auto-slug function
CREATE OR REPLACE FUNCTION public.seo_articles_auto_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := COALESCE(
      NEW.outline->>'slug',
      regexp_replace(
        regexp_replace(
          regexp_replace(
            lower(translate(NEW.keyword, 'àâäéèêëïîôùûüçÀÂÄÉÈÊËÏÎÔÙÛÜÇ', 'aaaeeeeiioouucaaaeeeeiioouuc')),
            '\s+', '-', 'g'
          ),
          '[^a-z0-9-]', '', 'g'
        ),
        '-+', '-', 'g'
      )
    );
  END IF;
  RETURN NEW;
END;
$$;