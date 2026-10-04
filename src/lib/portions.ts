/**
 * Portion Scaling Utilities
 * Single source of truth for household portion calculations
 */

export interface HouseholdInfo {
  adults: number;
  children: number;
}

/**
 * Child portion ratio — LEGACY flat value (0.7).
 * Prefer age-based childPortionCoeff() when child ages are known.
 * @deprecated Use childPortionCoeff(age) instead when ages are available.
 */
export const CHILD_PORTION_RATIO = 0.7;

/**
 * Age-based child portion coefficient — single source of truth.
 * Must match rpc_get_effective_portions in the database.
 */
export function childPortionCoeff(age: number): number {
  if (age <= 3) return 0.3;
  if (age <= 8) return 0.5;
  if (age <= 13) return 0.7;
  return 1.0;
}

/**
 * Calculate effective household size (total portions needed)
 * @param household - Object with adults and children counts
 * @returns Effective size as a decimal (e.g., 3.1 for 1 adult + 3 children)
 */
export function getHouseholdPortionFactor(household: HouseholdInfo): number {
  const { adults = 1, children = 0 } = household;
  return adults + children * CHILD_PORTION_RATIO;
}

/**
 * Calculate scale factor to apply to recipe quantities
 * @param householdFactor - Effective household size (from getHouseholdPortionFactor)
 * @param baseServings - Recipe's base servings (default 1 if not specified)
 * @returns Scale multiplier for ingredients/macros
 */
export function getScaleFactor(householdFactor: number, baseServings: number = 1): number {
  const base = Math.max(1, baseServings);
  return householdFactor / base;
}

/**
 * Round a number for display (smart rounding for quantities)
 * @param value - Number to round
 * @param decimals - Decimal places (default 1)
 * @returns Formatted string
 */
export function formatQuantity(value: number, decimals: number = 1): string {
  if (value === 0) return '0';

  // For values >= 10, no decimals needed
  if (value >= 10) return Math.round(value).toString();

  // For small values, use specified decimals
  const rounded = Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);

  // Remove trailing zeros
  return rounded.toString();
}

/**
 * Format portion display string
 * @param portions - Number of portions
 * @returns Formatted string like "3.1 portions" or "1 portion"
 */
export function formatPortions(portions: number): string {
  const formatted = String(Math.round(portions * 100) / 100);
  return `${formatted} portion${portions !== 1 ? 's' : ''}`;
}

/**
 * Scale nutrition values by a factor
 */
export interface NutritionValues {
  calories?: number | null;
  proteins?: number | null;
  carbs?: number | null;
  fats?: number | null;
  fibers?: number | null;
}

export function scaleNutrition(nutrition: NutritionValues, scale: number): NutritionValues {
  return {
    calories: nutrition.calories ? Math.round(nutrition.calories * scale) : null,
    proteins: nutrition.proteins ? Math.round(nutrition.proteins * scale) : null,
    carbs: nutrition.carbs ? Math.round(nutrition.carbs * scale) : null,
    fats: nutrition.fats ? Math.round(nutrition.fats * scale) : null,
    fibers: nutrition.fibers ? Math.round(nutrition.fibers * scale) : null,
  };
}

/**
 * Parse and scale an ingredient quantity string
 * @param ingredientText - Raw ingredient text (e.g., "200g flour" or "2 cups milk")
 * @param scale - Scale factor
 * @returns Scaled ingredient text
 */
export function parseQuantity(value: number | string): number | null {
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? value : null;
  const text = value
    .trim()
    .replace(',', '.')
    .replace(/(\d)([½¼¾])/g, '$1 $2')
    .replace(/½/g, '1/2')
    .replace(/¼/g, '1/4')
    .replace(/¾/g, '3/4');
  const fraction = text.match(/^(?:(\d+)\s+)?(\d+)\/(\d+)$/);
  if (fraction) {
    const denominator = Number(fraction[3]);
    return denominator > 0 ? Number(fraction[1] || 0) + Number(fraction[2]) / denominator : null;
  }
  if (!/^\d+(?:\.\d+)?$/.test(text)) return null;
  return Number(text);
}

export function scaleIngredientText(ingredientText: string, scale: number): string {
  if (!Number.isFinite(scale) || scale <= 0) throw new Error('Invalid portion factor');
  const amount = String.raw`(?:\d+\s*[½¼¾]|\d+\s+\d+/\d+|\d+/\d+|\d+(?:[.,]\d+)?|[½¼¾])`;
  const pattern = new RegExp(`^(\\s*)(${amount})(?:\\s*([-–])\\s*(${amount}))?`);
  const match = ingredientText.match(pattern);
  if (!match) return ingredientText;
  const first = parseQuantity(match[2]);
  const last = match[4] ? parseQuantity(match[4]) : null;
  if (first === null || (match[4] && last === null)) return ingredientText;
  const quantity = (n: number) => String(Math.round(n * scale * 1000) / 1000);
  return ingredientText.replace(
    pattern,
    `${match[1]}${quantity(first)}${last !== null ? '–' + quantity(last) : ''}`
  );
}

export interface IngredientItem {
  name?: string;
  nom?: string;
  ingredient?: string;
  quantity?: number | string;
  quantite?: number | string;
  amount?: number | string;
  unit?: string;
  unite?: string;
  raw?: string;
}

export function scaleIngredient(ingredient: IngredientItem | string, scale: number): string {
  if (typeof ingredient === 'string') return scaleIngredientText(ingredient, scale);
  const name = ingredient.name || ingredient.nom || ingredient.ingredient || '';
  const qty = ingredient.quantity ?? ingredient.quantite ?? ingredient.amount;
  const unit = ingredient.unit || ingredient.unite || '';
  if (qty !== undefined && qty !== null)
    return scaleIngredientText(`${qty} ${unit} ${name}`.replace(/\s+/g, ' ').trim(), scale);
  return scaleIngredientText(ingredient.raw || name, scale);
}

/**
 * Format household info for display
 * @param adults - Number of adults
 * @param children - Number of children
 * @returns Formatted string like "1 adulte + 3 enfants (≈ 3.1)"
 */
export function formatHouseholdDisplay(adults: number, children: number): string {
  const effectiveSize = getHouseholdPortionFactor({ adults, children });

  const parts: string[] = [];

  if (adults > 0) {
    parts.push(`${adults} adulte${adults > 1 ? 's' : ''}`);
  }

  if (children > 0) {
    parts.push(`${children} enfant${children > 1 ? 's' : ''}`);
  }

  const base = parts.join(' + ');

  if (adults !== 1 || children !== 0) {
    return `${base} (≈ ${formatQuantity(effectiveSize, 1)})`;
  }

  return base || '1 personne';
}
