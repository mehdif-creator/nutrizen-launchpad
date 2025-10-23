-- Migration: Storage Bucket Policies for Recipe Images
-- Purpose: Configure storage bucket and RLS policies
-- Date: 2025-01-23

-- =============================================================================
-- STORAGE BUCKET SETUP
-- =============================================================================

-- Option 1: Create PUBLIC bucket for recipe images (recommended for simplicity)
-- Uncomment if you want public access to recipe images

/*
INSERT INTO storage.buckets (id, name, public)
VALUES ('recipe-images', 'recipe-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow public read access
CREATE POLICY "Public read access for recipe images"
ON storage.objects FOR SELECT
USING (bucket_id = 'recipe-images');

-- Allow service role to upload/manage recipe images
CREATE POLICY "Service role can manage recipe images"
ON storage.objects FOR ALL
USING (bucket_id = 'recipe-images' AND auth.role() = 'service_role');

-- Allow authenticated admins to upload recipe images
CREATE POLICY "Admins can upload recipe images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'recipe-images' 
  AND auth.uid() IN (
    SELECT user_id FROM user_roles WHERE role = 'admin'
  )
);
*/

-- =============================================================================
-- Option 2: Private bucket with signed URLs (more secure)
-- =============================================================================

-- Create private bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('recipe-images', 'recipe-images', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Service role can read/write (for generating signed URLs)
CREATE POLICY "Service role full access"
ON storage.objects FOR ALL
USING (bucket_id = 'recipe-images' AND auth.role() = 'service_role');

-- Authenticated users can read (optional - remove if you want signed URLs only)
CREATE POLICY "Authenticated users can view recipe images"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'recipe-images' 
  AND auth.role() = 'authenticated'
);

-- Admins can upload
CREATE POLICY "Admins can upload recipe images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'recipe-images' 
  AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- =============================================================================
-- HELPER FUNCTION: Generate Signed URL
-- =============================================================================

-- Note: Signed URLs should be generated in Edge Functions using supabase-js
-- This is just a placeholder to document the approach

COMMENT ON TABLE storage.objects IS 
  'Recipe images stored in ''recipe-images'' bucket. 
   For private bucket: Generate signed URLs in edge functions.
   For public bucket: Use direct URLs.
   
   Example edge function code:
   const { data } = await supabase.storage
     .from(''recipe-images'')
     .createSignedUrl(imagePath, 604800); // 7 days';

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
DECLARE
  bucket_exists boolean;
  is_public boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'recipe-images') 
  INTO bucket_exists;
  
  IF bucket_exists THEN
    SELECT public INTO is_public 
    FROM storage.buckets 
    WHERE id = 'recipe-images';
    
    RAISE NOTICE '✓ Bucket ''recipe-images'' exists (public: %)', is_public;
    
    IF is_public THEN
      RAISE NOTICE 'Using PUBLIC bucket - direct URLs work';
      RAISE NOTICE 'Update recipes: image_url = https://PROJECT.supabase.co/storage/v1/object/public/recipe-images/PATH';
    ELSE
      RAISE NOTICE 'Using PRIVATE bucket - signed URLs required';
      RAISE NOTICE 'Generate signed URLs in edge functions before sending to client';
    END IF;
  ELSE
    RAISE WARNING 'Bucket ''recipe-images'' does not exist yet';
  END IF;
END $$;

-- =============================================================================
-- USAGE EXAMPLES
-- =============================================================================

-- PUBLIC BUCKET: Direct URL format
-- https://pghdaozgxkbtsxwydemd.supabase.co/storage/v1/object/public/recipe-images/curry.jpg

-- PRIVATE BUCKET: Generate signed URL in edge function
/*
const { data: signedUrl } = await supabase.storage
  .from('recipe-images')
  .createSignedUrl('curry.jpg', 604800); // 7 days = 604800 seconds

// Then include signedUrl.signedUrl in your menu payload
*/

RAISE NOTICE '✓ Storage policies configured';
