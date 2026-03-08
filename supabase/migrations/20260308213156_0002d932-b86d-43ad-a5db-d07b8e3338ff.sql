-- Ensure seo-images bucket exists and is public with proper limits
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'seo-images',
  'seo-images',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- Reset policies for this bucket to avoid conflicts
DROP POLICY IF EXISTS "Public read seo-images" ON storage.objects;
DROP POLICY IF EXISTS "Service role insert seo-images" ON storage.objects;
DROP POLICY IF EXISTS "Service role update seo-images" ON storage.objects;
DROP POLICY IF EXISTS "Service role delete seo-images" ON storage.objects;
DROP POLICY IF EXISTS "Auth insert seo-images" ON storage.objects;
DROP POLICY IF EXISTS "Auth update seo-images" ON storage.objects;

-- Public read for blog image delivery
CREATE POLICY "Public read seo-images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'seo-images');

-- Authenticated uploads/updates (admin tooling compatibility)
CREATE POLICY "Auth insert seo-images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'seo-images');

CREATE POLICY "Auth update seo-images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'seo-images')
WITH CHECK (bucket_id = 'seo-images');

-- Service role upload compatibility for edge functions
CREATE POLICY "Service role insert seo-images"
ON storage.objects
FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'seo-images');