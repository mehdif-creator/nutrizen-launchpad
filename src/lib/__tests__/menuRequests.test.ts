import { beforeEach, expect, it, vi } from 'vitest';
import { completeMenuRequest, menuRequestId } from '../menuRequests';
import { mergeShoppingItems } from '../shoppingListUtils';

beforeEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
});
it('réutilise une demande non confirmée après rechargement et isole les comptes', async () => {
  const first = menuRequestId('user-a', 'generate', '2026-09-28');
  vi.resetModules();
  const reloaded = await import('../menuRequests');
  expect(reloaded.menuRequestId('user-a', 'generate', '2026-09-28')).toBe(first);
  expect(reloaded.menuRequestId('user-b', 'generate', '2026-09-28')).not.toBe(first);
  reloaded.completeMenuRequest('user-a', 'generate', '2026-09-28');
  expect(reloaded.menuRequestId('user-a', 'generate', '2026-09-28')).not.toBe(first);
});
it('évite le double débit même si le stockage du navigateur est indisponible', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('disabled');
  });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('disabled');
  });
  const first = menuRequestId('private-browser', 'swap', 'meal');
  expect(menuRequestId('private-browser', 'swap', 'meal')).toBe(first);
  completeMenuRequest('private-browser', 'swap', 'meal');
  expect(menuRequestId('private-browser', 'swap', 'meal')).not.toBe(first);
});
it('l’affichage et les exports conservent les pièces et les volumes calculés côté serveur', () => {
  const items = mergeShoppingItems(
    [
      { ingredient_name: 'citron', total_quantity: 2.625, unit: 'piece', formatted_display: '' },
      { ingredient_name: 'jus de citron', total_quantity: 30, unit: 'ml', formatted_display: '' },
      { ingredient_name: 'carottes', total_quantity: 3, unit: 'piece', formatted_display: '' },
      { ingredient_name: 'Sel', total_quantity: null, unit: 'as_needed', formatted_display: '' },
    ],
    true
  );
  expect(items.map((i) => i.displayQty)).toEqual(['2.625', '30 ml', '3', 'selon le goût']);
  expect(items.map((i) => i.displayName)).toEqual(['citron', 'jus de citron', 'carottes', 'Sel']);
});
