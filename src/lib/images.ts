import { supabase } from '@/integrations/supabase/client';

const RECIPE_IMAGES_BUCKET = 'recipe-images';
const PLACEHOLDER_IMAGE = '/img/hero-default.png';

// Supabase storage base URL for public bucket
const STORAGE_BASE_URL = 'https://pghdaozgxkbtsxwydemd.supabase.co/storage/v1/object/public';

// Configuration: set to true if bucket is public, false if private
// This can be configured based on your Supabase Storage settings
const IS_BUCKET_PUBLIC = true;

// Cache for signed URLs (only used when bucket is private)
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();
const SIGNED_URL_DURATION_SECONDS = 3600; // 1 hour
const CACHE_BUFFER_SECONDS = 300; // Refresh 5 minutes before expiry

/**
 * Normalize an image path - handles double-prefixes and ensures correct format
 */
function normalizeImagePath(imagePath: string): string {
  // Remove leading slashes
  let path = imagePath.replace(/^\/+/, '');
  
  // Handle double bucket prefix (recipe-images/recipes/... or recipe-images/recipe-images/...)
  if (path.startsWith('recipe-images/')) {
    path = path.replace(/^recipe-images\//, '');
  }
  
  return path;
}

/**
 * Build a public URL for a given image path
 */
function buildPublicUrl(imagePath: string): string {
  const normalizedPath = normalizeImagePath(imagePath);
  return `${STORAGE_BASE_URL}/${RECIPE_IMAGES_BUCKET}/${normalizedPath}`;
}

/**
 * Get a signed URL from cache or generate a new one
 */
async function getSignedUrl(imagePath: string): Promise<string | null> {
  const normalizedPath = normalizeImagePath(imagePath);
  const now = Date.now();
  const cached = signedUrlCache.get(normalizedPath);
  
  // Return cached URL if still valid (with buffer)
  if (cached && cached.expiresAt > now + CACHE_BUFFER_SECONDS * 1000) {
    return cached.url;
  }
  
  // Generate new signed URL
  try {
    const { data, error } = await supabase.storage
      .from(RECIPE_IMAGES_BUCKET)
      .createSignedUrl(normalizedPath, SIGNED_URL_DURATION_SECONDS);
    
    if (error || !data?.signedUrl) {
      console.warn('Failed to create signed URL:', error?.message);
      return null;
    }
    
    // Cache the signed URL
    signedUrlCache.set(normalizedPath, {
      url: data.signedUrl,
      expiresAt: now + SIGNED_URL_DURATION_SECONDS * 1000,
    });
    
    return data.signedUrl;
  } catch (err) {
    console.warn('Error creating signed URL:', err);
    return null;
  }
}

/**
 * Get public URL for an image path
 */
function getPublicUrl(imagePath: string): string | null {
  // Use our own URL builder for consistency and to handle path normalization
  return buildPublicUrl(imagePath);
}

/**
 * Get the display URL for a recipe image with fallback handling (synchronous).
 * For public buckets, returns immediately.
 * For private buckets, returns cached URL or placeholder (use getRecipeImageUrlAsync for fresh signed URLs).
 * 
 * Priority:
 * 1. image_path (Supabase Storage path) - preferred, stable
 * 2. image_url (legacy full URL) - fallback for old records
 * 3. Placeholder
 */
export function getRecipeImageUrl(recipe: {
  image_url?: string | null;
  image_path?: string | null;
}): string {
  // Priority 1: Storage path (preferred - stable)
  if (recipe.image_path && recipe.image_path.trim() !== '') {
    if (IS_BUCKET_PUBLIC) {
      const publicUrl = getPublicUrl(recipe.image_path);
      if (publicUrl) return publicUrl;
    } else {
      // For private buckets, check cache first
      const cached = signedUrlCache.get(recipe.image_path);
      const now = Date.now();
      if (cached && cached.expiresAt > now + CACHE_BUFFER_SECONDS * 1000) {
        return cached.url;
      }
      // Return placeholder for now, use async version for fresh URL
      // This prevents waterfall requests in synchronous contexts
    }
  }

  // Priority 2: Direct URL (legacy fallback)
  if (recipe.image_url && recipe.image_url.trim() !== '') {
    return recipe.image_url;
  }

  // Priority 3: Placeholder
  return PLACEHOLDER_IMAGE;
}

/**
 * Async version for getting recipe image URL - use when you can await.
 * Essential for private buckets where signed URLs need to be generated.
 */
export async function getRecipeImageUrlAsync(recipe: {
  image_url?: string | null;
  image_path?: string | null;
}): Promise<string> {
  // Priority 1: Storage path (preferred - stable)
  if (recipe.image_path && recipe.image_path.trim() !== '') {
    if (IS_BUCKET_PUBLIC) {
      const publicUrl = getPublicUrl(recipe.image_path);
      if (publicUrl) return publicUrl;
    } else {
      const signedUrl = await getSignedUrl(recipe.image_path);
      if (signedUrl) return signedUrl;
    }
  }

  // Priority 2: Direct URL (legacy fallback)
  if (recipe.image_url && recipe.image_url.trim() !== '') {
    return recipe.image_url;
  }

  // Priority 3: Placeholder
  return PLACEHOLDER_IMAGE;
}

/**
 * Batch fetch image URLs for multiple recipes (efficient for lists)
 * Returns a Map of recipe id/index to image URL
 */
export async function getRecipeImageUrls<T extends { id?: string; image_url?: string | null; image_path?: string | null }>(
  recipes: T[]
): Promise<Map<string, string>> {
  const urlMap = new Map<string, string>();
  
  if (IS_BUCKET_PUBLIC) {
    // Public bucket - synchronous
    recipes.forEach((recipe, index) => {
      const key = recipe.id || String(index);
      urlMap.set(key, getRecipeImageUrl(recipe));
    });
  } else {
    // Private bucket - batch generate signed URLs
    const promises = recipes.map(async (recipe, index) => {
      const key = recipe.id || String(index);
      const url = await getRecipeImageUrlAsync(recipe);
      return { key, url };
    });
    
    const results = await Promise.all(promises);
    results.forEach(({ key, url }) => {
      urlMap.set(key, url);
    });
  }
  
  return urlMap;
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

/**
 * Configuration helper to check bucket status
 */
export function isBucketPublic(): boolean {
  return IS_BUCKET_PUBLIC;
}
