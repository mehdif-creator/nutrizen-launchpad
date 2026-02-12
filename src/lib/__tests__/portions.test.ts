import { describe, it, expect } from 'vitest';
import {
  getHouseholdPortionFactor,
  getScaleFactor,
  formatQuantity,
  formatPortions,
  scaleNutrition,
  scaleIngredientText,
  scaleIngredient,
  formatHouseholdDisplay,
  CHILD_PORTION_RATIO,
} from '@/lib/portions';

describe('getHouseholdPortionFactor', () => {
  it('1 adult, 0 children = 1', () => {
    expect(getHouseholdPortionFactor({ adults: 1, children: 0 })).toBe(1);
  });

  it('1 adult, 3 children = 3.1', () => {
    expect(getHouseholdPortionFactor({ adults: 1, children: 3 })).toBeCloseTo(3.1, 1);
  });

  it('2 adults, 2 children = 3.4', () => {
    expect(getHouseholdPortionFactor({ adults: 2, children: 2 })).toBeCloseTo(3.4, 1);
  });

  it('child ratio is 0.7', () => {
    expect(CHILD_PORTION_RATIO).toBe(0.7);
  });
});

describe('getScaleFactor', () => {
  it('factor/base = scale', () => {
    expect(getScaleFactor(3.1, 1)).toBe(3.1);
    expect(getScaleFactor(3.1, 2)).toBeCloseTo(1.55);
  });

  it('base cannot be < 1', () => {
    expect(getScaleFactor(2, 0)).toBe(2); // max(1, 0) = 1
  });
});

describe('formatQuantity', () => {
  it('0 → "0"', () => {
    expect(formatQuantity(0)).toBe('0');
  });

  it('values >= 10 have no decimals', () => {
    expect(formatQuantity(12.7)).toBe('13');
    expect(formatQuantity(10)).toBe('10');
  });

  it('small values keep specified decimals', () => {
    expect(formatQuantity(3.14, 1)).toBe('3.1');
    expect(formatQuantity(0.5, 1)).toBe('0.5');
  });

  it('removes trailing zeros', () => {
    expect(formatQuantity(2.0, 1)).toBe('2');
  });
});

describe('formatPortions', () => {
  it('singular for 1', () => {
    expect(formatPortions(1)).toBe('1 portion');
  });

  it('plural for other values', () => {
    expect(formatPortions(3.1)).toBe('3.1 portions');
    expect(formatPortions(2)).toBe('2 portions');
  });
});

describe('scaleNutrition', () => {
  it('scales all fields and rounds', () => {
    const result = scaleNutrition({ calories: 100, proteins: 20, carbs: 30, fats: 10, fibers: 5 }, 3.1);
    expect(result.calories).toBe(310);
    expect(result.proteins).toBe(62);
    expect(result.carbs).toBe(93);
    expect(result.fats).toBe(31);
    expect(result.fibers).toBe(16);
  });

  it('handles null values', () => {
    const result = scaleNutrition({ calories: null, proteins: 20, carbs: null, fats: null, fibers: null }, 2);
    expect(result.calories).toBeNull();
    expect(result.proteins).toBe(40);
  });
});

describe('scaleIngredientText', () => {
  it('scale 1 returns original', () => {
    expect(scaleIngredientText('200g flour', 1)).toBe('200g flour');
  });

  it('scales leading number', () => {
    expect(scaleIngredientText('200g flour', 2)).toBe('400g flour');
  });

  it('scales fractions (best effort - scales leading digit)', () => {
    // Note: "1/2" matches the leading number regex first (captures "1"), so it scales "1" → "2"
    // This is a known limitation of best-effort parsing
    expect(scaleIngredientText('1/2 cup milk', 2)).toBe('2/2 cup milk');
  });

  it('no quantity unchanged', () => {
    expect(scaleIngredientText('salt to taste', 3)).toBe('salt to taste');
  });
});

describe('scaleIngredient (object format)', () => {
  it('scales object with qty+unit', () => {
    const result = scaleIngredient({ name: 'flour', quantity: 200, unit: 'g' }, 2);
    expect(result).toBe('400 g flour');
  });

  it('handles string format', () => {
    const result = scaleIngredient('100g sugar', 3);
    expect(result).toBe('300g sugar');
  });
});

describe('formatHouseholdDisplay', () => {
  it('1 adult shows simple label', () => {
    expect(formatHouseholdDisplay(1, 0)).toBe('1 adulte');
  });

  it('1 adult + 3 children shows factor', () => {
    const result = formatHouseholdDisplay(1, 3);
    expect(result).toContain('1 adulte');
    expect(result).toContain('3 enfants');
    expect(result).toContain('3.1');
  });

  it('pluralizes correctly', () => {
    expect(formatHouseholdDisplay(2, 1)).toContain('2 adultes');
    expect(formatHouseholdDisplay(2, 1)).toContain('1 enfant');
  });
});
