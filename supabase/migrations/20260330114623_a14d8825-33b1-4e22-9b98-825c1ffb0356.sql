
-- Fix STORAGE_EXPOSURE: Restrict seo-images bucket to admin-only uploads

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Auth insert seo-images" ON storage.objects;
DROP POLICY IF EXISTS "Auth update seo-images" ON storage.objects;

-- Create admin-only INSERT policy
CREATE POLICY "Admin insert seo-images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'seo-images' AND has_role(auth.uid(), 'admin'::app_role));

-- Create admin-only UPDATE policy
CREATE POLICY "Admin update seo-images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'seo-images' AND has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (bucket_id = 'seo-images' AND has_role(auth.uid(), 'admin'::app_role));
