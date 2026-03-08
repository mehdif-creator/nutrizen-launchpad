
-- Create seo-images storage bucket if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'seo-images',
  'seo-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow public read access
CREATE POLICY "Public read seo-images" ON storage.objects
FOR SELECT USING (bucket_id = 'seo-images');

-- Allow service role to insert
CREATE POLICY "Service role insert seo-images" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'seo-images');
