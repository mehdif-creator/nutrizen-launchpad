/**
 * Feature costs for Zen Credits economy
 * Must stay in sync with database feature_costs table
 */

export const FEATURE_COSTS = {
  swap: 1,
  scan_repas: 2,
  inspi_frigo: 2,
  substitutions: 1,
} as const;

export type FeatureType = keyof typeof FEATURE_COSTS;

/**
 * Get the credit cost for a feature
 */
export function getFeatureCost(feature: FeatureType): number {
  return FEATURE_COSTS[feature] || 1;
}

/**
 * Feature display names in French
 */
export const FEATURE_NAMES: Record<FeatureType, string> = {
  swap: 'Changer une recette',
  scan_repas: 'ScanRepas - Analyse photo',
  inspi_frigo: 'InspiFrigo - Recette du frigo',
  substitutions: 'Substitution ingredient',
};

/**
 * Feature descriptions in French
 */
export const FEATURE_DESCRIPTIONS: Record<FeatureType, string> = {
  swap: 'Remplacez une recette de votre menu par une nouvelle suggestion personnalisee.',
  scan_repas: 'Photographiez votre repas pour obtenir analyse nutritionnelle complete.',
  inspi_frigo: 'Photographiez vos ingredients pour recevoir une recette adaptee.',
  substitutions: 'Trouvez des alternatives saines pour un ingredient de recette.',
};
