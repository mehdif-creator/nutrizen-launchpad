import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { hasSeenNativeIntro } from '@/lib/native/nativeStartup';
import NativeWelcome from '@/pages/native/NativeWelcome';

/**
 * Native-only entry point for "/" (Capacitor Android/iOS).
 * The marketing landing page is never rendered inside the app.
 *
 * - session being restored → splash
 * - signed in              → /app/dashboard (ProtectedRoute then handles
 *                            onboarding, paywall and admin redirects)
 * - first launch           → native welcome screen
 * - already launched once  → login screen
 */
export function NativeEntryRouter() {
  const { user, initializingSession } = useAuth();
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

  if (initializingSession || introSeen === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">NutriZen</p>
      </div>
    );
  }

  if (user) return <Navigate to="/app/dashboard" replace />;
  if (!introSeen) return <NativeWelcome />;
  return <Navigate to="/auth/login" replace />;
}
