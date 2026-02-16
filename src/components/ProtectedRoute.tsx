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

  // Wait for initial auth loading
  const isAuthLoading = loading || (requireAdmin ? adminLoading : false);

  if (isAuthLoading && !timedOut) {
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
  if (!requireAdmin && isAdmin && location.pathname === '/app') {
    return <Navigate to="/admin" replace />;
  }

  // For admin routes: only redirect if adminLoading is fully done AND user is not admin
  if (requireAdmin && !adminLoading && !isAdmin) {
    if (!denialToastShown.current) {
      denialToastShown.current = true;
      toast.error('Accès refusé — vous n\'avez pas les droits administrateur.');
    }
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
};
