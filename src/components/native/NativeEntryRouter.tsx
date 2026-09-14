import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { hasSeenNativeIntro } from '@/lib/native/nativeStartup';
import { useNativeStartupRoute } from '@/hooks/useNativeStartupRoute';
import NativeWelcome from '@/pages/native/NativeWelcome';

/**
 * Native-only entry point for "/" (Capacitor Android/iOS).
 * The marketing landing page is never rendered inside the app.
 *
 * Decision (Supabase = source of truth, see useNativeStartupRoute):
 * - no session          → native welcome (first launch) or login screen
 * - onboarding pending  → /app/onboarding
 * - no plan yet         → /app/paywall
 * - plan active         → /app/dashboard
 */
export function NativeEntryRouter() {
  const destination = useNativeStartupRoute();
  const [introSeen, setIntroSeen] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    hasSeenNativeIntro().then((seen) => {
      if (mounted) setIntroSeen(seen);
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (destination === 'loading' || introSeen === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">NutriZen</p>
      </div>
    );
  }

  if (destination === 'auth') {
    if (!introSeen) return <NativeWelcome />;
    return <Navigate to="/auth/login" replace />;
  }

  if (destination === 'onboarding') return <Navigate to="/app/onboarding" replace />;
  if (destination === 'paywall') return <Navigate to="/app/paywall" replace />;
  return <Navigate to="/app/dashboard" replace />;
}
