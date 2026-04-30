
-- 1) Drop unused backup table (no policies, no governance)
DROP TABLE IF EXISTS public.manual_social_posts_backup_20260328;

-- 2) Restrict user_badges INSERT — remove self-grant policy.
-- Badges must only be granted by service role / SECURITY DEFINER functions.
DROP POLICY IF EXISTS "Users can insert own badges" ON public.user_badges;

-- 3) Storage buckets: add SELECT (public read for public buckets) and
-- restrict DELETE to admins / service role for recipe-images, social-images,
-- seo-images and guides.

-- Public SELECT policies (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Public read recipe-images') THEN
    CREATE POLICY "Public read recipe-images" ON storage.objects FOR SELECT USING (bucket_id = 'recipe-images');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Public read social-images') THEN
    CREATE POLICY "Public read social-images" ON storage.objects FOR SELECT USING (bucket_id = 'social-images');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Public read seo-images') THEN
    CREATE POLICY "Public read seo-images" ON storage.objects FOR SELECT USING (bucket_id = 'seo-images');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Public read guides') THEN
    CREATE POLICY "Public read guides" ON storage.objects FOR SELECT USING (bucket_id = 'guides');
  END IF;
END $$;

-- Admin-only DELETE policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Admin delete recipe-images') THEN
    CREATE POLICY "Admin delete recipe-images" ON storage.objects FOR DELETE USING (bucket_id = 'recipe-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Admin delete social-images') THEN
    CREATE POLICY "Admin delete social-images" ON storage.objects FOR DELETE USING (bucket_id = 'social-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Admin delete seo-images') THEN
    CREATE POLICY "Admin delete seo-images" ON storage.objects FOR DELETE USING (bucket_id = 'seo-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Admin delete guides') THEN
    CREATE POLICY "Admin delete guides" ON storage.objects FOR DELETE USING (bucket_id = 'guides' AND public.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;
END $$;
