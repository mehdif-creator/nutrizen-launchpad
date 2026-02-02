import { supabase } from '@/integrations/supabase/client';

const RECIPE_IMAGES_BUCKET = 'recipe-images';
const PLACEHOLDER_IMAGE = '/img/hero-default.png';

/**
 * Get the display URL for a recipe image with fallback handling.
 * Priority:
 * 1. image_url (full URL)
 * 2. image_path (Supabase Storage path)
 * 3. Placeholder
 */
export function getRecipeImageUrl(recipe: {
  image_url?: string | null;
  image_path?: string | null;
}): string {
  // Priority 1: Direct URL
  if (recipe.image_url && recipe.image_url.trim() !== '') {
    return recipe.image_url;
  }

  // Priority 2: Storage path
  if (recipe.image_path && recipe.image_path.trim() !== '') {
    const { data } = supabase.storage
      .from(RECIPE_IMAGES_BUCKET)
      .getPublicUrl(recipe.image_path);
    
    if (data?.publicUrl) {
      return data.publicUrl;
    }
  }

  // Priority 3: Placeholder
  return PLACEHOLDER_IMAGE;
}

/**
 * Placeholder image for fallback
 */
export const RECIPE_PLACEHOLDER = PLACEHOLDER_IMAGE;

/**
 * Error handler for img onError to swap to placeholder
 */
export function handleImageError(e: React.SyntheticEvent<HTMLImageElement>) {
  const target = e.target as HTMLImageElement;
  if (target.src !== PLACEHOLDER_IMAGE) {
    target.src = PLACEHOLDER_IMAGE;
    // Add a subtle indicator that image failed
    target.classList.add('opacity-60');
  }
}
