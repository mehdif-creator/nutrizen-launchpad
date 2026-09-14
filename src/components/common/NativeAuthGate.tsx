import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { isNativePlatform } from '@/lib/platform';
import { useNativeAuthDeepLink } from '@/hooks/useNativeAuthDeepLink';
import { useNativeStartupRoute } from '@/hooks/useNativeStartupRoute';

const PAYWALL_PATH = '/app/paywall';
const ONBOARDING_PATH = '/app/onboarding';

/**
 * Native-only startup gate (Capacitor). On the web it renders children untouched.
 *
 * 1. While the Supabase session is being restored, show only the NutriZen splash.
 * 2. Inside /app, enforce the Supabase-driven order: onboarding → paywall → dashboard.
 *    A brand new signup already has a session, so it can never skip those steps.
 * 3. Registers the `nutrizen://auth/callback` deep-link handler.
 */
export function NativeAuthGate({ children }: { children: React.ReactNode }) {
  const native = isNativePlatform();
  const { user, initializingSession } = useAuth();
  const location = useLocation();
  useNativeAuthDeepLink();
  const destination = useNativeStartupRoute();

  if (!native) return <>{children}</>;

  if (initializingSession) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">NutriZen</p>
      </div>
    );
  }

  const inApp = !!user && location.pathname.startsWith('/app');

  if (inApp) {
    if (destination === 'loading' && location.pathname !== ONBOARDING_PATH) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }
    if (destination === 'onboarding' && location.pathname !== ONBOARDING_PATH) {
      return <Navigate to={ONBOARDING_PATH} replace />;
    }
    if (destination === 'paywall' && location.pathname !== PAYWALL_PATH) {
      return <Navigate to={PAYWALL_PATH} replace />;
    }
  }

  return <>{children}</>;
}
