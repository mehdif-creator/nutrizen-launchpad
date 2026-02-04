/**
 * OnboardingGuard - Wraps protected routes to enforce onboarding completion
 * 
 * This component:
 * 1. Checks if onboarding is complete using the single source of truth
 * 2. Redirects to /app/onboarding if not complete
 * 3. Handles all loading states to prevent flicker
 * 4. Works with ProtectedRoute (assumes user is already authenticated)
 */

import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';
import { Loader2 } from 'lucide-react';

interface OnboardingGuardProps {
  children: React.ReactNode;
}

// Routes that don't require onboarding to be complete
const ONBOARDING_EXEMPT_ROUTES = [
  '/app/onboarding',
  '/auth/',
];

// Check if current path is exempt from onboarding requirement
function isExemptRoute(pathname: string): boolean {
  return ONBOARDING_EXEMPT_ROUTES.some(route => pathname.startsWith(route));
}

export function OnboardingGuard({ children }: OnboardingGuardProps) {
  const { user, loading: authLoading } = useAuth();
  const { loading: onboardingLoading, completed } = useOnboardingStatus(user?.id);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Prevent multiple redirects
  const hasRedirected = useRef(false);
  const redirectAttempted = useRef(false);

  // Reset redirect flag when user changes
  useEffect(() => {
    hasRedirected.current = false;
    redirectAttempted.current = false;
  }, [user?.id]);

  useEffect(() => {
    // Wait for both auth and onboarding to load
    if (authLoading || onboardingLoading) {
      return;
    }

    // No user = handled by ProtectedRoute
    if (!user) {
      return;
    }

    // Check if current route is exempt
    const isExempt = isExemptRoute(location.pathname);
    
    if (isExempt) {
      // On onboarding page but already completed? Redirect to dashboard
      if (location.pathname.startsWith('/app/onboarding') && completed && !hasRedirected.current) {
        hasRedirected.current = true;
        console.log('[OnboardingGuard] Already completed, redirecting to dashboard');
        navigate('/app/dashboard', { replace: true });
      }
      return;
    }

    // Not exempt and not completed? Redirect to onboarding
    if (!completed && !hasRedirected.current && !redirectAttempted.current) {
      redirectAttempted.current = true;
      hasRedirected.current = true;
      console.log('[OnboardingGuard] Not completed, redirecting to onboarding');
      navigate('/app/onboarding', { replace: true });
    }
  }, [authLoading, onboardingLoading, user, completed, location.pathname, navigate]);

  // Show loading state while determining onboarding status
  if (authLoading || onboardingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If we're redirecting, show loading to prevent flicker
  if (!completed && !isExemptRoute(location.pathname)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
