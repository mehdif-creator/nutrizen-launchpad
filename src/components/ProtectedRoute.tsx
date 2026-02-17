import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { useOnboardingGuard } from '@/hooks/useOnboardingGuard';
import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';

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
  const denialToastShown = useRef(false);
  
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

  // Only reset timeout if auth is genuinely still loading
  useEffect(() => {
    if (loading || adminLoading) {
      setTimedOut(false);
    }
  }, [location.pathname, loading, adminLoading]);

  // D) For admin routes: block render while adminLoading OR loading is true
  if (requireAdmin) {
    if ((loading || adminLoading) && !timedOut) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    // No user at all → login
    if (!user) {
      return <Navigate to="/auth/login" replace />;
    }

    // Admin check done, user is NOT admin → redirect
    if (!adminLoading && !isAdmin) {
      if (!denialToastShown.current) {
        denialToastShown.current = true;
        toast.error('Accès refusé — vous n\'avez pas les droits administrateur.');
      }
      return <Navigate to="/app" replace />;
    }

    // Admin confirmed → render children
    return <>{children}</>;
  }

  // --- Non-admin routes below ---

  // Wait for initial auth loading
  if (loading && !timedOut) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // No user at all → login
  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  // Wait for onboarding check
  if (shouldCheckOnboarding && onboardingStatus.state === 'loading' && !timedOut) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect admin to admin dashboard if they try to access /app root
  if (isAdmin && location.pathname === '/app') {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
};
