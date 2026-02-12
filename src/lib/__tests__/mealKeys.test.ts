import { describe, it, expect } from 'vitest';
import { normalizeMealKey, getMealLabel, matchesMealKey } from '@/lib/mealKeys';

describe('normalizeMealKey', () => {
  it('returns null for null/undefined/empty', () => {
    expect(normalizeMealKey(null)).toBeNull();
    expect(normalizeMealKey(undefined)).toBeNull();
    expect(normalizeMealKey('')).toBeNull();
  });

  it('normalizes lunch variations', () => {
    expect(normalizeMealKey('lunch')).toBe('lunch');
    expect(normalizeMealKey('Lunch')).toBe('lunch');
    expect(normalizeMealKey('déjeuner')).toBe('lunch');
    expect(normalizeMealKey('Dejeuner')).toBe('lunch');
    expect(normalizeMealKey('MIDI')).toBe('lunch');
    expect(normalizeMealKey('midday')).toBe('lunch');
  });

  it('normalizes dinner variations', () => {
    expect(normalizeMealKey('dinner')).toBe('dinner');
    expect(normalizeMealKey('Dîner')).toBe('dinner');
    expect(normalizeMealKey('diner')).toBe('dinner');
    expect(normalizeMealKey('SOIR')).toBe('dinner');
    expect(normalizeMealKey('souper')).toBe('dinner');
    expect(normalizeMealKey('evening')).toBe('dinner');
  });

  it('normalizes breakfast variations', () => {
    expect(normalizeMealKey('breakfast')).toBe('breakfast');
    expect(normalizeMealKey('petit déjeuner')).toBe('breakfast');
    expect(normalizeMealKey('Petit-Dejeuner')).toBe('breakfast');
    expect(normalizeMealKey('matin')).toBe('breakfast');
  });

  it('returns null for unrecognized values', () => {
    expect(normalizeMealKey('brunch')).toBeNull();
    expect(normalizeMealKey('snack')).toBeNull();
    expect(normalizeMealKey('goûter')).toBeNull();
  });

  it('handles whitespace', () => {
    expect(normalizeMealKey('  lunch  ')).toBe('lunch');
    expect(normalizeMealKey('  déjeuner ')).toBe('lunch');
  });
});

describe('getMealLabel', () => {
  it('returns French labels by default', () => {
    expect(getMealLabel('lunch')).toBe('Déjeuner');
    expect(getMealLabel('dinner')).toBe('Dîner');
    expect(getMealLabel('breakfast')).toBe('Petit-déjeuner');
  });

  it('returns English labels', () => {
    expect(getMealLabel('lunch', 'en')).toBe('Lunch');
    expect(getMealLabel('dinner', 'en')).toBe('Dinner');
  });

  it('returns empty for null', () => {
    expect(getMealLabel(null)).toBe('');
  });
});

describe('matchesMealKey', () => {
  it('matches correctly', () => {
    expect(matchesMealKey('déjeuner', 'lunch')).toBe(true);
    expect(matchesMealKey('soir', 'dinner')).toBe(true);
    expect(matchesMealKey('soir', 'lunch')).toBe(false);
  });

  it('handles null', () => {
    expect(matchesMealKey(null, 'lunch')).toBe(false);
  });
});
