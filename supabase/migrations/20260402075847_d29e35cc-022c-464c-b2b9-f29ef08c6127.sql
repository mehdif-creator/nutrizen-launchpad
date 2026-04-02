
-- 1. Add redirect column
ALTER TABLE public.seo_articles ADD COLUMN IF NOT EXISTS redirect_to_slug text;

-- 2. Expand status check constraint to include 'retired'
ALTER TABLE public.seo_articles DROP CONSTRAINT seo_articles_status_check;
ALTER TABLE public.seo_articles ADD CONSTRAINT seo_articles_status_check
  CHECK (status = ANY (ARRAY['pending','serp_done','brief_done','outline_done','images_done','draft_done','qa_done','published','failed','retired']));

-- 3. Retire duplicates with redirect targets

-- "Que faire avec des pâtes" → keep pates-versions-legeres (000a61b8)
UPDATE public.seo_articles SET status = 'retired', redirect_to_slug = 'pates-versions-legeres'
WHERE id IN ('23ada111-e742-49ab-a706-922e77e5b7b2', 'e5deb68b-eb15-4e90-914a-92e96914163f', '781db344-c221-4baf-a34c-e18d076e7ff0');

-- "Frigo vide" → keep frigo-vide-diners-fonds-placard (57a0e7cc)
UPDATE public.seo_articles SET status = 'retired', redirect_to_slug = 'frigo-vide-diners-fonds-placard'
WHERE id = 'd6e66878-b850-4300-be1a-e715e6feda0e';

-- "Que manger soir ventre" → keep plan-repas-soir-ventre-plat (b82330ba)
UPDATE public.seo_articles SET status = 'retired', redirect_to_slug = 'plan-repas-soir-ventre-plat'
WHERE id = 'ec06e048-da29-4891-af1b-b592d9d4d620';

-- "Repas soir sans cuisson été" → keep repas-soir-ete-sans-cuisson (194efdce)
UPDATE public.seo_articles SET status = 'retired', redirect_to_slug = 'repas-soir-ete-sans-cuisson'
WHERE id = 'd9debb7d-fb72-4160-83a0-ab7303396741';

-- "Repas flemme famille" → keep repas-flemme-famille-3-ingredients (fb35ccc0)
UPDATE public.seo_articles SET status = 'retired', redirect_to_slug = 'repas-flemme-famille-3-ingredients'
WHERE id = 'c3c7ac47-3ee4-407e-b3b3-b378295984e3';

-- "Riz healthy" → keep que-faire-avec-riz-12-idees (db54eca2)
UPDATE public.seo_articles SET status = 'retired', redirect_to_slug = 'que-faire-avec-riz-12-idees'
WHERE id = 'a69b9479-5355-483d-96f3-48270a3cf2af';

-- 4. Prevent future duplicate keywords among published articles
CREATE UNIQUE INDEX IF NOT EXISTS idx_seo_articles_keyword_published
ON public.seo_articles (keyword) WHERE status = 'published';
