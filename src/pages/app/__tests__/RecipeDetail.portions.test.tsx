import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import RecipeDetail from '../RecipeDetail';

const mocks = vi.hoisted(() => ({ pdf: vi.fn(), award: vi.fn(), toast: vi.fn() }));
vi.mock('@/components/app/AppHeader', () => ({ AppHeader: () => null }));
vi.mock('@/components/app/AppFooter', () => ({ AppFooter: () => null }));
vi.mock('@/components/app/FavoriteButton', () => ({ FavoriteButton: () => null }));
vi.mock('@/components/recipe/SubstitutionsTab', () => ({ SubstitutionsTab: () => null }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user' } }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/hooks/useAwardXp', () => ({ useAwardXp: () => ({ awardRecipeView: mocks.award }) }));
vi.mock('@/hooks/useFavorites', () => ({
  useFavorites: () => ({ isFavorite: () => false, toggleFavorite: vi.fn() }),
}));
vi.mock('@/hooks/useEffectivePortions', () => ({
  useEffectivePortions: () => ({ data: { effective_servings_per_meal: 4 } }),
}));
vi.mock('@/lib/recipePdfExport', () => ({ exportRecipePdf: mocks.pdf }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => {
      const query = {
        select: () => query,
        eq: () => query,
        single: async () => ({
          data: {
            id: 'recipe',
            title: 'Riz du menu',
            base_servings: 2,
            servings: 6,
            ingredients: [{ name: 'riz', quantity: 200, unit: 'g' }, '1/2 citron'],
            instructions: ['Cuire et servir.'],
            calories_kcal: 650,
            proteins_g: 30,
            carbs_g: 70,
            fats_g: 20,
            allergens: [],
            appliances: [],
          },
          error: null,
        }),
      };
      return query;
    },
  },
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
function show(query: string) {
  render(
    <MemoryRouter initialEntries={['/app/recipes/recipe' + query]}>
      <Routes>
        <Route path="/app/recipes/:id" element={<RecipeDetail />} />
      </Routes>
    </MemoryRouter>
  );
}
it('affiche les portions du repas, les calories individuelles et exporte les mêmes quantités', async () => {
  show('?servings=1.5');
  expect(await screen.findByText('150 g riz')).toBeInTheDocument();
  expect(screen.getByText('0.375 citron')).toBeInTheDocument();
  expect(screen.getByText('650 kcal / portion')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /PDF/i }));
  expect(mocks.pdf).toHaveBeenCalledWith(
    expect.objectContaining({
      servings: 1.5,
      calories_kcal: 650,
      ingredients: ['150 g riz', '0.375 citron'],
    })
  );
});
it('rejette une valeur de portions invalide dans le lien', async () => {
  show('?servings=-5');
  expect(await screen.findByText('400 g riz')).toBeInTheDocument();
});
