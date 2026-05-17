import type { ManualSocialPost } from '@/hooks/useManualSocialPosts';

/** Parse a JSON field that should be string[] safely */
function parseStringArray(val: unknown): string[] | null {
  if (!val) return null;
  if (Array.isArray(val)) return val.map(String);
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      /* ignore */
    }
  }
  return null;
}

/** Get ingredients as string[] preferring JSON, falling back to text split by newline */
export function getIngredients(post: ManualSocialPost): string[] {
  const fromJson = parseStringArray(post.ingredients_json);
  if (fromJson && fromJson.length > 0) return fromJson;
  if (post.ingredients_text?.trim()) {
    return post.ingredients_text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
  }
  return [];
}

/** Get preparation steps as string[] preferring JSON, falling back to text split by newline */
export function getPreparationSteps(post: ManualSocialPost): string[] {
  const fromJson = parseStringArray(post.preparation_steps_json);
  if (fromJson && fromJson.length > 0) return fromJson;
  if (post.preparation_steps_text?.trim()) {
    return post.preparation_steps_text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
  }
  return [];
}

/** Check if a post has any recipe data */
export function hasRecipeData(post: ManualSocialPost): boolean {
  return getIngredients(post).length > 0 || getPreparationSteps(post).length > 0;
}

/** Format ingredients as plain text for clipboard */
export function formatIngredientsText(post: ManualSocialPost): string {
  return getIngredients(post)
    .map((i) => `• ${i}`)
    .join('\n');
}

/** Format preparation steps as plain text for clipboard */
export function formatPreparationText(post: ManualSocialPost): string {
  return getPreparationSteps(post)
    .map((s, i) => `${i + 1}. ${s}`)
    .join('\n');
}

/** Build a TikTok-ready script block */
export function buildTikTokScript(post: ManualSocialPost): string {
  const title = post.title || 'Sans titre';
  const ingredients = getIngredients(post);
  const steps = getPreparationSteps(post);
  const url = post.website_url || 'https://mynutrizen.fr/';

  const parts: string[] = [title, ''];

  if (ingredients.length > 0) {
    parts.push('Ingrédients :');
    ingredients.forEach((i) => parts.push(`• ${i}`));
    parts.push('');
  }

  if (steps.length > 0) {
    parts.push('Préparation :');
    steps.forEach((s, idx) => parts.push(`${idx + 1}. ${s}`));
    parts.push('');
  }

  parts.push('Retrouve la recette complète sur NutriZen :');
  parts.push(url);

  return parts.join('\n');
}
