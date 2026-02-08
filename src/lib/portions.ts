/**
 * Portion Scaling Utilities
 * Single source of truth for household portion calculations
 */

export interface HouseholdInfo {
  adults: number;
  children: number;
}

/**
 * Child portion ratio (children count as 0.7 of an adult)
 */
export const CHILD_PORTION_RATIO = 0.7;

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
  const formatted = formatQuantity(portions, 1);
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

export function scaleNutrition(
  nutrition: NutritionValues,
  scale: number
): NutritionValues {
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
export function scaleIngredientText(ingredientText: string, scale: number): string {
  if (scale === 1) return ingredientText;
  
  // Match leading numbers, fractions, and ranges
  const quantityPattern = /^(\d+(?:[.,]\d+)?(?:\s*[-–]\s*\d+(?:[.,]\d+)?)?)/;
  const match = ingredientText.match(quantityPattern);
  
  if (match) {
    const originalQty = parseFloat(match[1].replace(',', '.').split(/[-–]/)[0]);
    if (!isNaN(originalQty)) {
      const scaledQty = originalQty * scale;
      const formattedQty = formatQuantity(scaledQty, 1);
      return ingredientText.replace(quantityPattern, formattedQty);
    }
  }
  
  // Check for fraction-like patterns (1/2, 3/4, etc.)
  const fractionPattern = /^(\d+)\/(\d+)/;
  const fractionMatch = ingredientText.match(fractionPattern);
  
  if (fractionMatch) {
    const numerator = parseInt(fractionMatch[1]);
    const denominator = parseInt(fractionMatch[2]);
    const fractionValue = numerator / denominator;
    const scaledValue = fractionValue * scale;
    const formattedQty = formatQuantity(scaledValue, 2);
    return ingredientText.replace(fractionPattern, formattedQty);
  }
  
  // No quantity found - return unchanged
  return ingredientText;
}

/**
 * Scale an entire ingredient object
 */
export interface IngredientItem {
  name?: string;
  ingredient?: string;
  quantity?: number | string;
  unit?: string;
  raw?: string;
}

export function scaleIngredient(ingredient: IngredientItem | string, scale: number): string {
  if (typeof ingredient === 'string') {
    return scaleIngredientText(ingredient, scale);
  }
  
  // Handle object format
  const name = ingredient.name || ingredient.ingredient || '';
  const qty = ingredient.quantity;
  const unit = ingredient.unit || '';
  
  if (qty !== undefined && qty !== null) {
    const numQty = typeof qty === 'number' ? qty : parseFloat(String(qty));
    if (!isNaN(numQty)) {
      const scaledQty = formatQuantity(numQty * scale, 1);
      return `${scaledQty}${unit ? ' ' + unit : ''} ${name}`.trim();
    }
  }
  
  // Fallback to raw text or name
  if (ingredient.raw) {
    return scaleIngredientText(ingredient.raw, scale);
  }
  
  return name;
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
