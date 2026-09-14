/**
 * Native startup state, computed ONCE for the whole app (Supabase = source of truth).
 *
 * Both `NativeEntryRouter` (route "/") and `NativeAuthGate` read this context, so the
 * onboarding + plan reads happen a single time per session instead of twice in parallel.
 *
 * Guarantees:
 * - `loading` only while a request is actually in flight (with a hard timeout).
 * - any Supabase failure (error state, unknown plan, timeout) yields `error`, never an
 *   infinite spinner, and never a bypass of onboarding / paywall.
 * - `retry()` re-runs both reads (cache-busted).
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { clearOnboardingCache, getOnboardingStatus } from '@/lib/onboarding/status';
import { clearPlanStatusCache, getPlanStatus } from '@/lib/native/planStatus';
import { createLogger } from '@/lib/logger';
import { isNativePlatform } from '@/lib/platform';

const logger = createLogger('NativeStartup');

/** Hard timeout for the startup reads (ms). Exceeding it surfaces the error screen. */
const STARTUP_TIMEOUT_MS = 12000;

export type NativeStartupDestination =
  | 'loading'
  | 'error'
  | 'auth'
  | 'onboarding'
  | 'paywall'
  | 'dashboard';

export interface NativeStartupState {
  destination: NativeStartupDestination;
  /** Human readable reason of the failure, only set when destination === 'error'. */
  errorMessage: string | null;
  retry: () => void;
  /** Same as retry() — re-reads Supabase after a plan/onboarding change. */
  refresh: () => void;
}


const NativeStartupContext = createContext<NativeStartupState | null>(null);

function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Délai dépassé lors de la lecture ${label}`)),
      STARTUP_TIMEOUT_MS
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

export function NativeStartupProvider({ children }: { children: React.ReactNode }) {
  const { user, initializingSession } = useAuth();
  const [destination, setDestination] = useState<NativeStartupDestination>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const retry = useCallback(() => {
    if (user) {
      clearOnboardingCache(user.id);
      clearPlanStatusCache(user.id);
    }
    setErrorMessage(null);
    setDestination('loading');
    setAttempt((n) => n + 1);
  }, [user]);

  useEffect(() => {
    // Web is untouched: no startup read at all outside Capacitor.
    if (!isNativePlatform()) {
      setDestination('auth');
      setErrorMessage(null);
      return;
    }
    if (initializingSession) {
      setDestination('loading');
      setErrorMessage(null);
      return;
    }
    if (!user) {
      setDestination('auth');
      setErrorMessage(null);
      return;
    }

    let active = true;
    setDestination('loading');
    setErrorMessage(null);

    (async () => {
      try {
        const onboarding = await withTimeout(getOnboardingStatus(user.id), 'du profil');
        if (!active || !mountedRef.current) return;

        if (onboarding.state === 'error') {
          throw new Error(onboarding.errorMessage || 'Lecture du profil impossible');
        }
        if (onboarding.state === 'needs_onboarding') {
          setDestination('onboarding');
          return;
        }

        const plan = await withTimeout(getPlanStatus(user.id), "de l'offre");
        if (!active || !mountedRef.current) return;

        if (plan.state === 'unknown') {
          throw new Error("Lecture de l'offre impossible");
        }
        setDestination(plan.state === 'no_plan' ? 'paywall' : 'dashboard');
      } catch (error) {
        if (!active || !mountedRef.current) return;
        const message = error instanceof Error ? error.message : String(error);
        logger.error('Startup read failed', error instanceof Error ? error : new Error(message), {
          userId: user.id,
          attempt,
        });
        setErrorMessage(message);
        setDestination('error');
      }
    })();

    return () => {
      active = false;
    };
  }, [user, initializingSession, attempt]);

  return (
    <NativeStartupContext.Provider value={{ destination, errorMessage, retry }}>
      {children}
    </NativeStartupContext.Provider>
  );
}

export function useNativeStartup(): NativeStartupState {
  const ctx = useContext(NativeStartupContext);
  if (!ctx) {
    throw new Error('useNativeStartup must be used inside <NativeStartupProvider>');
  }
  return ctx;
}
