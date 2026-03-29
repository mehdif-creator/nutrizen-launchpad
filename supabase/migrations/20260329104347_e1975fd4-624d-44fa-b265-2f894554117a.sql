-- Step 1: Add slug column
ALTER TABLE public.seo_articles ADD COLUMN IF NOT EXISTS slug text;

-- Step 2: Populate slug for all rows
UPDATE public.seo_articles
SET slug = COALESCE(
  outline->>'slug',
  regexp_replace(
    regexp_replace(
      regexp_replace(
        lower(translate(keyword, 'àâäéèêëïîôùûüçÀÂÄÉÈÊËÏÎÔÙÛÜÇ', 'aaaeeeeiioouucaaaeeeeiioouuc')),
        '\s+', '-', 'g'
      ),
      '[^a-z0-9-]', '', 'g'
    ),
    '-+', '-', 'g'
  )
)
WHERE slug IS NULL OR slug = '';

-- Step 3: Deduplicate - append id suffix for non-first duplicates
WITH dupes AS (
  SELECT id, slug, row_number() OVER (PARTITION BY slug ORDER BY
    CASE WHEN status = 'published' THEN 0 ELSE 1 END,
    updated_at DESC
  ) as rn
  FROM public.seo_articles
  WHERE slug IS NOT NULL AND slug != ''
)
UPDATE public.seo_articles sa
SET slug = sa.slug || '-' || substr(sa.id::text, 1, 8)
FROM dupes d
WHERE sa.id = d.id AND d.rn > 1;

-- Step 4: Create unique index (only on non-empty slugs)
CREATE UNIQUE INDEX IF NOT EXISTS idx_seo_articles_slug_unique
ON public.seo_articles (slug)
WHERE slug IS NOT NULL AND slug != '';

-- Step 5: Index for published listing
CREATE INDEX IF NOT EXISTS idx_seo_articles_published
ON public.seo_articles (status, updated_at DESC)
WHERE status = 'published';

-- Step 6: Auto-slug trigger
CREATE OR REPLACE FUNCTION public.seo_articles_auto_slug()
RETURNS trigger
LANGUAGE plpgsql
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

DROP TRIGGER IF EXISTS trg_seo_articles_auto_slug ON public.seo_articles;
CREATE TRIGGER trg_seo_articles_auto_slug
BEFORE INSERT OR UPDATE ON public.seo_articles
FOR EACH ROW EXECUTE FUNCTION public.seo_articles_auto_slug();