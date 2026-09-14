import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { isNativePlatform } from '@/lib/platform';
import { useNativeAuthDeepLink } from '@/hooks/useNativeAuthDeepLink';
import { getOnboardingStatus } from '@/lib/onboarding/status';
import { getNativePlanChoice } from '@/lib/native/nativeStartup';

const PAYWALL_PATH = '/app/paywall';

/**
 * Native-only: after onboarding, a user who never picked a formula on this
 * device is sent once to the native paywall. Never runs on the web.
 */
function useNativePaywallGate(enabled: boolean, userId: string | undefined) {
  const [state, setState] = useState<'idle' | 'loading' | 'required' | 'ok'>('idle');

  useEffect(() => {
    if (!enabled || !userId) {
      setState('idle');
      return;
    }
    let mounted = true;
    setState('loading');
    (async () => {
      try {
        const [status, choice] = await Promise.all([
          getOnboardingStatus(userId),
          getNativePlanChoice(userId),
        ]);
        if (!mounted) return;
        // Onboarding not finished (or unknown) → let the existing guards decide.
        if (status.state !== 'onboarded') return setState('ok');
        setState(choice ? 'ok' : 'required');
      } catch {
        if (mounted) setState('ok');
      }
    })();
    return () => {
      mounted = false;
    };
  }, [enabled, userId]);

  return state;
}

/**
 * Native-only startup gate (Capacitor). On the web it renders children untouched.
 *
 * 1. While the Supabase session is being restored from persistent storage,
 *    show only the NutriZen splash — never the landing page.
 * 2. Once resolved, a signed-in user who has completed onboarding but never
 *    picked a formula on this device is routed to the native paywall.
 * 3. Registers the `nutrizen://auth/callback` deep-link handler.
 */
export function NativeAuthGate({ children }: { children: React.ReactNode }) {
  const native = isNativePlatform();
  const { user, initializingSession } = useAuth();
  const location = useLocation();
  useNativeAuthDeepLink();

  const inApp =
    native &&
    !!user &&
    location.pathname.startsWith('/app') &&
    location.pathname !== PAYWALL_PATH &&
    location.pathname !== '/app/onboarding';

  const paywallState = useNativePaywallGate(inApp, user?.id);

  if (!native) return <>{children}</>;

  if (initializingSession) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">NutriZen</p>
      </div>
    );
  }

  if (inApp && paywallState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (inApp && paywallState === 'required') {
    return <Navigate to={PAYWALL_PATH} replace />;
  }

  return <>{children}</>;
}
