import { beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
const m = vi.hoisted(() => ({ signIn: vi.fn(), navigate: vi.fn(), toast: vi.fn() }));
vi.mock('react-router-dom', async () => ({ ...await vi.importActual('react-router-dom'), useNavigate: () => m.navigate }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { signInWithPassword: m.signIn } } }));
vi.mock('@/lib/auth/oauth', () => ({ signInWithGoogle: vi.fn() }));
vi.mock('@/lib/platform', () => ({ isNativePlatform: () => false, getWebOrigin: () => 'https://example.test' }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: m.toast }) }));
import Login from '@/pages/auth/Login';
beforeEach(() => { cleanup(); vi.resetAllMocks(); });
function submit(redirect = '/app') {
  render(<MemoryRouter initialEntries={['/auth/login?redirect=' + encodeURIComponent(redirect)]}><Login /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Se connecter avec un mot de passe' }));
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'review@example.test' } });
  fireEvent.change(screen.getByLabelText('Mot de passe NutriZen'), { target: { value: 'test-password' } });
  fireEvent.click(screen.getByRole('button', { name: 'Se connecter' }));
}
it('does not navigate when authentication fails', async () => {
  m.signIn.mockResolvedValue({ data: { session: null }, error: new Error('invalid') }); submit();
  await waitFor(() => expect(m.toast).toHaveBeenCalled()); expect(m.navigate).not.toHaveBeenCalled();
});
it('requires a returned session even without an API error', async () => {
  m.signIn.mockResolvedValue({ data: { session: null }, error: null }); submit();
  await waitFor(() => expect(m.toast).toHaveBeenCalled()); expect(m.navigate).not.toHaveBeenCalled();
});
it.each(['https://external.test', '//external.test', '/\\external.test'])('blocks external redirect %s after successful authentication', async redirect => {
  m.signIn.mockResolvedValue({ data: { session: {} }, error: null }); submit(redirect);
  await waitFor(() => expect(m.navigate).toHaveBeenCalledWith('/app', { replace: true }));
});
it('preserves a local destination after successful authentication', async () => {
  m.signIn.mockResolvedValue({ data: { session: {} }, error: null }); submit('/credits');
  await waitFor(() => expect(m.navigate).toHaveBeenCalledWith('/credits', { replace: true }));
});
