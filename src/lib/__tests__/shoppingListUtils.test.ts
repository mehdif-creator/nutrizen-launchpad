import { describe, expect, it } from 'vitest';
import { mergeShoppingItems, type RawShoppingItem } from '@/lib/shoppingListUtils';

describe('mergeShoppingItems', () => {
  it('merges ingredient variants (frais / en fines tranches) into one line', () => {
    const raw: RawShoppingItem[] = [
      { ingredient_name: 'concombre', total_quantity: 38, unit: 'g', formatted_display: '' },
      { ingredient_name: 'concombre en fines tranches', total_quantity: 38, unit: 'g', formatted_display: '' },
      { ingredient_name: 'concombre frais', total_quantity: 38, unit: 'g', formatted_display: '' },
    ];

    const merged = mergeShoppingItems(raw);

    expect(merged).toHaveLength(1);
    expect(merged[0].displayName.toLowerCase()).toContain('concombre');
    expect(merged[0].displayQty).toBe('114g');
  });

  it('recovers spoon unit from ingredient name when backend sends piece', () => {
    const raw: RawShoppingItem[] = [
      {
        ingredient_name: "c. à café d'huile de sésame",
        total_quantity: 0.7,
        unit: 'piece',
        formatted_display: '',
      },
    ];

    const merged = mergeShoppingItems(raw);

    expect(merged).toHaveLength(1);
    expect(merged[0].displayName.toLowerCase()).toContain("huile de sésame");
    expect(merged[0].displayQty).toContain('c. à café');
    expect(merged[0].displayQty).not.toContain('piece');
  });

  it('rounds countable items to practical integers/halves', () => {
    const raw: RawShoppingItem[] = [
      {
        ingredient_name: "gousse d'ail",
        total_quantity: 3.1,
        unit: 'piece',
        formatted_display: '',
      },
    ];

    const merged = mergeShoppingItems(raw);

    expect(merged).toHaveLength(1);
    expect(merged[0].displayQty).toBe('3');
  });

  it('formats tiny spoon quantities as pinch', () => {
    const raw: RawShoppingItem[] = [
      {
        ingredient_name: "huile de sésame",
        total_quantity: 0.05,
        unit: 'tsp',
        formatted_display: '',
      },
    ];

    const merged = mergeShoppingItems(raw);

    expect(merged).toHaveLength(1);
    expect(merged[0].displayQty).toBe('1 pincée');
  });

  it('merges grams + pieces of the same produce into one total', () => {
    const raw: RawShoppingItem[] = [
      { ingredient_name: 'concombre', total_quantity: 93, unit: 'g', formatted_display: '' },
      {
        ingredient_name: 'concombre coupé en fines tranches',
        total_quantity: 1.6,
        unit: 'piece',
        formatted_display: '',
      },
      { ingredient_name: 'concombre frais', total_quantity: 155, unit: 'g', formatted_display: '' },
    ];

    const merged = mergeShoppingItems(raw);

    expect(merged).toHaveLength(1);
    // 93g + (1.6*300g) + 155g = 728g
    expect(merged[0].displayQty).toBe('728g');
  });
});
