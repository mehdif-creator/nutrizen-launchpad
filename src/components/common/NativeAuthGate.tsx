import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { isNativePlatform } from '@/lib/platform';
import { useNativeAuthDeepLink } from '@/hooks/useNativeAuthDeepLink';

/**
 * Native-only startup gate (Capacitor). On the web it renders children untouched.
 *
 * 1. While the Supabase session is being restored from persistent storage,
 *    show only the NutriZen splash — never the landing page.
 * 2. Once resolved: a signed-in user landing on "/" is sent to /app, where
 *    ProtectedRoute applies the existing onboarding + admin redirects.
 * 3. Registers the `nutrizen://auth/callback` deep-link handler.
 */
export function NativeAuthGate({ children }: { children: React.ReactNode }) {
  const native = isNativePlatform();
  const { user, initializingSession } = useAuth();
  const location = useLocation();
  useNativeAuthDeepLink();

  if (!native) return <>{children}</>;

  if (initializingSession) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">NutriZen</p>
      </div>
    );
  }

  if (user && location.pathname === '/') {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}
