import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { OnboardingGuard } from '@/components/OnboardingGuard';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  /** Skip onboarding check (for onboarding page itself) */
  skipOnboarding?: boolean;
}

export const ProtectedRoute = ({ 
  children, 
  requireAdmin = false,
  skipOnboarding = false,
}: ProtectedRouteProps) => {
  const { user, loading, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  // Redirect admin to admin dashboard if they try to access /app
  if (!requireAdmin && isAdmin && location.pathname === '/app') {
    return <Navigate to="/admin" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/app" replace />;
  }

  // Admin routes skip onboarding check
  if (requireAdmin) {
    return <>{children}</>;
  }

  // Onboarding page itself skips the guard
  if (skipOnboarding || location.pathname.startsWith('/app/onboarding')) {
    return <>{children}</>;
  }

  // Wrap protected content in onboarding guard
  return <OnboardingGuard>{children}</OnboardingGuard>;
};
