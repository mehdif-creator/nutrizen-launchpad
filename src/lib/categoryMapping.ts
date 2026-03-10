/**
 * Maps internal SEO category labels to user-friendly display labels.
 * Internal labels like "longue traîne", "pilier", "tier 1" etc. must never
 * be shown to end users.
 */
export function getCategoryLabel(category: string | null | undefined): string {
  const cat = (category || '').toLowerCase().trim();
  if (!cat) return 'Nutrition';

  if (cat.includes('fitness') || cat.includes('muscul')) return 'Fitness';
  if (cat.includes('famille') || cat.includes('enfant')) return 'Famille';
  if (cat.includes('santé') || cat.includes('sante') || cat.includes('sant') || cat.includes('digest')) return 'Santé';
  if (cat.includes('airfryer') || cat.includes('cuisine')) return 'Cuisine';
  if (cat.includes('vegan') || cat.includes('vegeta') || cat.includes('végéta')) return 'Végétarien';
  if (cat.includes('budget')) return 'Budget';
  if (cat.includes('snack') || cat.includes('collation')) return 'Snacking';

  // Internal SEO labels → default to Nutrition
  const internalPatterns = ['longue', 'pilier', 'tier ', 'tier-', 'quick win', 'cluster', 'seo'];
  if (internalPatterns.some(p => cat.includes(p))) return 'Nutrition';

  // If the value is already clean, return it capitalized
  return category!.charAt(0).toUpperCase() + category!.slice(1);
}
