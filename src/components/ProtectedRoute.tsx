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

  // Timeout fallback: never show spinner for more than 15 seconds on admin routes, 8s otherwise
  const timeoutMs = requireAdmin ? 15000 : 8000;
  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), timeoutMs);
    return () => clearTimeout(timer);
  }, [timeoutMs]);

  // D) For admin routes: block render while adminLoading OR loading is true
  if (requireAdmin) {
    // Still loading and not timed out: show spinner
    if ((loading || adminLoading) && !timedOut) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    // No user → redirect to login
    if (!user) {
      return <Navigate to="/auth/login" replace />;
    }

    // Admin confirmed → render children immediately
    if (isAdmin) {
      return <>{children}</>;
    }

    // Not admin: either timed out or admin check completed with !isAdmin → deny
    if (timedOut || !adminLoading) {
      if (!denialToastShown.current) {
        denialToastShown.current = true;
        toast.error('Accès refusé — vous n\'avez pas les droits administrateur.');
      }
      return <Navigate to="/app" replace />;
    }

    // Fallback: still loading (shouldn't reach here, but safety net)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
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
  // Only redirect once admin check is fully resolved to avoid loops
  if (isAdmin && !adminLoading && location.pathname === '/app') {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
};
