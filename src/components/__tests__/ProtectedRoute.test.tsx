import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '../ProtectedRoute';

// ---------- Mocks ----------
const mockUseAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/hooks/useOnboardingGuard', () => ({
  useOnboardingGuard: () => ({ state: 'onboarded', completedAt: '2025-01-01', step: 0 }),
}));

// ---------- Helper ----------
function renderProtected(path: string, requireAdmin = false) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path={path}
          element={
            <ProtectedRoute requireAdmin={requireAdmin} skipOnboardingCheck>
              <div data-testid="protected-content">Protected</div>
            </ProtectedRoute>
          }
        />
        <Route path="/auth/login" element={<div data-testid="login-page">Login</div>} />
        <Route path="/app" element={<div data-testid="app-page">App</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

// ---------- Tests ----------
describe('ProtectedRoute', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows spinner while auth is loading (no redirect/flash)', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true, adminLoading: true, isAdmin: false });
    const { container, queryByTestId } = renderProtected('/app/dashboard');
    expect(queryByTestId('protected-content')).toBeNull();
    expect(queryByTestId('login-page')).toBeNull();
    expect(container.querySelector('.animate-spin')).not.toBeNull();
  });

  it('shows spinner while adminLoading is true even if auth done', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, loading: false, adminLoading: true, isAdmin: false });
    const { container, queryByTestId } = renderProtected('/app/dashboard');
    expect(queryByTestId('protected-content')).toBeNull();
    expect(queryByTestId('login-page')).toBeNull();
    expect(container.querySelector('.animate-spin')).not.toBeNull();
  });

  it('redirects to login when no user', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false, adminLoading: false, isAdmin: false });
    const { getByTestId } = renderProtected('/app/dashboard');
    expect(getByTestId('login-page')).toBeInTheDocument();
  });

  it('renders content for authenticated user', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, loading: false, adminLoading: false, isAdmin: false });
    const { getByTestId } = renderProtected('/app/dashboard');
    expect(getByTestId('protected-content')).toBeInTheDocument();
  });

  it('blocks non-admin from admin routes', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, loading: false, adminLoading: false, isAdmin: false });
    const { getByTestId } = renderProtected('/admin', true);
    expect(getByTestId('app-page')).toBeInTheDocument();
  });

  it('allows admin on admin routes', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'a1' }, loading: false, adminLoading: false, isAdmin: true });
    const { getByTestId } = renderProtected('/admin', true);
    expect(getByTestId('protected-content')).toBeInTheDocument();
  });
});
