/**
 * Meal Type Normalization Utilities
 * Single source of truth for meal slot/type keys
 */

export type MealKey = 'breakfast' | 'lunch' | 'dinner';

/**
 * Mapping of various meal type strings to canonical keys
 */
const MEAL_KEY_MAP: Record<string, MealKey> = {
  // Breakfast variations
  'breakfast': 'breakfast',
  'petit dejeuner': 'breakfast',
  'petit-dejeuner': 'breakfast',
  'petit déjeuner': 'breakfast',
  'petit-déjeuner': 'breakfast',
  'matin': 'breakfast',
  
  // Lunch variations  
  'lunch': 'lunch',
  'dejeuner': 'lunch',
  'déjeuner': 'lunch',
  'midi': 'lunch',
  'midday': 'lunch',
  
  // Dinner variations
  'dinner': 'dinner',
  'diner': 'dinner',
  'dîner': 'dinner',
  'soir': 'dinner',
  'souper': 'dinner',
  'evening': 'dinner',
};

/**
 * Remove accents from a string
 */
function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Normalize a meal type string to a canonical key
 * @param value - Raw meal type string
 * @returns Normalized meal key or null if not recognized
 */
export function normalizeMealKey(value: string | null | undefined): MealKey | null {
  if (!value) return null;
  
  // Normalize: lowercase, trim, remove accents, replace hyphens with spaces
  const normalized = removeAccents(value.toLowerCase().trim()).replace(/-/g, ' ');
  
  // Direct lookup
  if (normalized in MEAL_KEY_MAP) {
    return MEAL_KEY_MAP[normalized];
  }
  
  // Check if any mapping key is contained in the input
  for (const [pattern, key] of Object.entries(MEAL_KEY_MAP)) {
    if (normalized.includes(removeAccents(pattern))) {
      return key;
    }
  }
  
  return null;
}

/**
 * Get display label for a meal key
 * @param key - Canonical meal key
 * @param locale - Locale for display (default: 'fr')
 * @returns Display label
 */
export function getMealLabel(key: MealKey | null, locale: string = 'fr'): string {
  if (!key) return '';
  
  const labels: Record<string, Record<MealKey, string>> = {
    fr: {
      breakfast: 'Petit-déjeuner',
      lunch: 'Déjeuner',
      dinner: 'Dîner',
    },
    en: {
      breakfast: 'Breakfast',
      lunch: 'Lunch',
      dinner: 'Dinner',
    },
  };
  
  return labels[locale]?.[key] || labels.fr[key] || key;
}

/**
 * Check if a raw meal type matches a specific canonical key
 * @param raw - Raw meal type string from database
 * @param expected - Expected canonical key
 * @returns true if they match
 */
export function matchesMealKey(raw: string | null | undefined, expected: MealKey): boolean {
  return normalizeMealKey(raw) === expected;
}
