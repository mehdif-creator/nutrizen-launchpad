
-- Normalize image_path: strip leading "recipe-images/" prefix so paths are canonical object paths
-- e.g. "recipe-images/recipes/<uuid>.png" → "recipes/<uuid>.png"
UPDATE recipes
SET image_path = regexp_replace(image_path, '^recipe-images/', '')
WHERE image_path LIKE 'recipe-images/%';

-- Rebuild image_url from normalized image_path using the canonical storage URL
UPDATE recipes
SET image_url = 'https://pghdaozgxkbtsxwydemd.supabase.co/storage/v1/object/public/recipe-images/' || image_path
WHERE image_path IS NOT NULL AND image_path != '';

-- Add public read policy for recipe-images bucket (anon + authenticated)
-- First drop if exists to be idempotent
DROP POLICY IF EXISTS "Public read access for recipe images" ON storage.objects;
CREATE POLICY "Public read access for recipe images"
ON storage.objects FOR SELECT
USING (bucket_id = 'recipe-images');
