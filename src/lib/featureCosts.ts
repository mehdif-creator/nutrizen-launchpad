/**
 * Feature costs for Zen Credits economy (v2)
 * Must stay in sync with database feature_costs table
 */

export const FEATURE_COSTS = {
  swap: 1,
  scan_repas: 4,
  inspi_frigo: 6,
  substitutions: 1,
  generate_meal: 1,
  generate_week_1: 6,
  generate_week_2: 11,
  regenerate_day: 2,
  regenerate_week: 8,
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
  substitutions: 'Substitution ingrédient',
  generate_meal: 'Générer 1 repas',
  generate_week_1: 'Générer semaine (1 repas/jour)',
  generate_week_2: 'Générer semaine (2 repas/jour)',
  regenerate_day: 'Regénérer un jour',
  regenerate_week: 'Regénérer semaine complète',
};

/**
 * Feature descriptions in French
 */
export const FEATURE_DESCRIPTIONS: Record<FeatureType, string> = {
  swap: 'Remplacez une recette de votre menu par une nouvelle suggestion personnalisée.',
  scan_repas: 'Photographiez votre repas pour obtenir une analyse nutritionnelle complète.',
  inspi_frigo: 'Photographiez vos ingrédients pour recevoir une recette adaptée.',
  substitutions: 'Trouvez des alternatives saines pour un ingrédient de recette.',
  generate_meal: 'Générez un repas personnalisé selon vos préférences.',
  generate_week_1: 'Générez un menu hebdomadaire avec 1 repas par jour.',
  generate_week_2: 'Générez un menu hebdomadaire avec déjeuner et dîner.',
  regenerate_day: 'Remplacez toutes les recettes d\'un jour.',
  regenerate_week: 'Regénérez l\'intégralité de votre menu hebdomadaire.',
};

/**
 * Credit costs formatted for display in pricing UI
 */
export const CREDIT_COSTS_DISPLAY = [
  { label: 'Générer 1 repas', cost: 1 },
  { label: 'Générer semaine (1 repas/jour, 7 repas)', cost: 6 },
  { label: 'Générer semaine (déjeuner + dîner, 14 repas)', cost: 11 },
  { label: 'Scan repas (vision)', cost: 4 },
  { label: 'Analyse frigo (vision + planning)', cost: 6 },
  { label: 'Substitution d\'ingrédient', cost: 1 },
  { label: 'Regénérer un jour', cost: 2 },
  { label: 'Regénérer semaine complète', cost: 8 },
];
