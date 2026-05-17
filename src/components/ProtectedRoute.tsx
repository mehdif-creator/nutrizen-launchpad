import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { useOnboardingGuard } from '@/hooks/useOnboardingGuard';
import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { NutriZenChatbot } from '@/components/app/NutriZenChatbot';
import { BootstrapRecovery } from '@/components/common/BootstrapRecovery';
import { clearOnboardingCache } from '@/lib/onboarding/status';

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
  const { user, loading, adminLoading, isAdmin, recheckAdmin } = useAuth();
  const location = useLocation();
  const [timedOut, setTimedOut] = useState(false);
  const denialToastShown = useRef(false);
  const [adminRecheckState, setAdminRecheckState] = useState<'idle' | 'pending' | 'done'>('idle');

  const shouldCheckOnboarding =
    !requireAdmin && !skipOnboardingCheck && location.pathname !== '/app/onboarding';

  const onboardingStatus = useOnboardingGuard(shouldCheckOnboarding ? user?.id : undefined);

  // Timeout fallback
  const timeoutMs = requireAdmin ? 40000 : 8000;
  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), timeoutMs);
    return () => clearTimeout(timer);
  }, [timeoutMs]);

  // Force re-check admin role when navigating to an admin route
  useEffect(() => {
    let mounted = true;
    if (requireAdmin && user && adminRecheckState === 'idle') {
      setAdminRecheckState('pending');
      recheckAdmin()
        .then(() => {
          if (mounted) setAdminRecheckState('done');
        })
        .catch(() => {
          if (mounted) setAdminRecheckState('done');
        });
    }
    return () => {
      mounted = false;
    };
  }, [requireAdmin, user?.id, adminRecheckState]);

  // Callback when BootstrapRecovery finishes repair
  const handleRepaired = useCallback(() => {
    if (user?.id) {
      clearOnboardingCache(user.id);
      // Force page reload to re-evaluate all guards with fresh data
      window.location.reload();
    }
  }, [user?.id]);

  // For admin routes
  if (requireAdmin) {
    if (isAdmin) return <>{children}</>;

    const stillChecking =
      loading || adminLoading || adminRecheckState === 'pending' || adminRecheckState === 'idle';
    if (stillChecking && !timedOut) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    if (!user) return <Navigate to="/auth/login" replace />;

    if (adminRecheckState !== 'done' && !timedOut) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }
    if (!denialToastShown.current) {
      denialToastShown.current = true;
      toast.error("Accès refusé — vous n'avez pas les droits administrateur.");
    }
    return <Navigate to="/app" replace />;
  }

  // --- Non-admin routes below ---

  if (loading && !timedOut) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  // Handle onboarding error state — show recovery UI instead of silently skipping
  if (shouldCheckOnboarding && onboardingStatus.state === 'error') {
    return <BootstrapRecovery userId={user.id} onRepaired={handleRepaired} />;
  }

  if (shouldCheckOnboarding && onboardingStatus.state === 'loading' && !timedOut) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isAdmin && !adminLoading && location.pathname === '/app') {
    return <Navigate to="/admin" replace />;
  }

  return (
    <>
      {children}
      {!requireAdmin && <NutriZenChatbot />}
    </>
  );
};
