import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ invoke: vi.fn(), session: vi.fn(), invalidate: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { auth: { getSession: mocks.session }, functions: { invoke: mocks.invoke } },
}));
vi.mock('@/lib/queryClient', () => ({ queryClient: { invalidateQueries: mocks.invalidate } }));
vi.mock('@/hooks/useWeeklyMenu', () => ({ getCurrentWeekStart: () => '2026-09-28' }));
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ info: vi.fn(), debug: vi.fn(), error: vi.fn() }),
}));
import { generateMenuForUser } from '../generateMenu';
let userNumber = 0;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.session.mockResolvedValue({
    data: { session: { access_token: 'test', user: { id: 'user-' + ++userNumber } } },
  });
});
it('refuse une génération sans session', async () => {
  mocks.session.mockResolvedValue({ data: { session: null } });
  expect((await generateMenuForUser()).success).toBe(false);
  expect(mocks.invoke).not.toHaveBeenCalled();
});
it('affiche l’erreur de profil du serveur sans annoncer un menu prêt', async () => {
  mocks.invoke.mockResolvedValue({
    data: null,
    error: {
      context: {
        json: async () => ({
          error_code: 'PROFILE_INCOMPLETE',
          message: 'Complétez les allergies.',
        }),
      },
    },
  });
  expect(await generateMenuForUser()).toEqual({
    success: false,
    error_code: 'PROFILE_INCOMPLETE',
    message: 'Complétez les allergies.',
  });
  expect(mocks.invalidate).not.toHaveBeenCalled();
});
it('réessaie la même demande après une erreur réseau et libère l’identifiant après succès', async () => {
  mocks.invoke
    .mockResolvedValueOnce({ data: null, error: new Error('Network') })
    .mockResolvedValue({ data: { success: true, menu_id: 'menu' }, error: null });
  expect((await generateMenuForUser()).success).toBe(false);
  expect((await generateMenuForUser()).success).toBe(true);
  const calls = mocks.invoke.mock.calls;
  expect(calls[0][1].body).toEqual(calls[1][1].body);
  await generateMenuForUser();
  expect(calls[2][1].body.request_id).not.toBe(calls[1][1].body.request_id);
});
it('ne traite pas une réponse métier négative comme un succès', async () => {
  mocks.invoke.mockResolvedValue({
    data: { success: false, message: 'Crédits insuffisants', error_code: 'INSUFFICIENT_CREDITS' },
    error: null,
  });
  expect((await generateMenuForUser()).success).toBe(false);
  expect(mocks.invalidate).not.toHaveBeenCalled();
});
