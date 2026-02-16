import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { useOnboardingGuard } from '@/hooks/useOnboardingGuard';
import { useState, useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  skipOnboardingCheck?: boolean;
}

export const ProtectedRoute = ({ 
  children, 
  requireAdmin = false,
  skipOnboardingCheck = false,
}: ProtectedRouteProps) => {
  const { user, loading, adminLoading, isAdmin } = useAuth();
  const location = useLocation();
  const [timedOut, setTimedOut] = useState(false);
  
  const shouldCheckOnboarding = !requireAdmin && !skipOnboardingCheck && 
    location.pathname !== '/app/onboarding';
  
  const onboardingStatus = useOnboardingGuard(
    shouldCheckOnboarding ? user?.id : undefined
  );

  // Timeout fallback: never show spinner for more than 8 seconds
  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), 8000);
    return () => clearTimeout(timer);
  }, []);

  // Reset timeout when route changes
  useEffect(() => {
    setTimedOut(false);
  }, [location.pathname]);

  const isStillLoading = loading || adminLoading;

  // Wait for auth, but respect timeout
  if (isStillLoading && !timedOut) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // After timeout, if still no user, redirect to login
  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  // Wait for onboarding check, but respect timeout
  if (shouldCheckOnboarding && onboardingStatus.state === 'loading' && !timedOut) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect admin to admin dashboard if they try to access /app
  if (!requireAdmin && isAdmin && location.pathname === '/app') {
    return <Navigate to="/admin" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
};
