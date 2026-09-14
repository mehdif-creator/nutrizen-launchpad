import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getOnboardingStatus } from '@/lib/onboarding/status';
import { getPlanStatus } from '@/lib/native/planStatus';

export type NativeStartupDestination =
  | 'loading'
  | 'auth'
  | 'onboarding'
  | 'paywall'
  | 'dashboard';

/**
 * Native startup decision, computed from Supabase only:
 *
 * | session | onboarding  | plan        | destination |
 * |---------|-------------|-------------|-------------|
 * | no      | -           | -           | auth (welcome / login / signup) |
 * | yes     | incomplete  | -           | onboarding  |
 * | yes     | complete    | none        | paywall     |
 * | yes     | complete    | active      | dashboard   |
 *
 * Supabase fields: `profiles.onboarding_completed_at` (onboarding) and
 * `subscriptions.status` / `profiles.plan_tier` / `profiles.plan_selection` (plan).
 * A read failure keeps the user on `loading`-safe paths (never skips the gates).
 */
export function useNativeStartupRoute(): NativeStartupDestination {
  const { user, initializingSession } = useAuth();
  const [destination, setDestination] = useState<NativeStartupDestination>('loading');

  useEffect(() => {
    if (initializingSession) {
      setDestination('loading');
      return;
    }
    if (!user) {
      setDestination('auth');
      return;
    }

    let mounted = true;
    setDestination('loading');

    (async () => {
      const onboarding = await getOnboardingStatus(user.id);
      if (!mounted) return;

      if (onboarding.state === 'needs_onboarding') return setDestination('onboarding');
      if (onboarding.state !== 'onboarded') return setDestination('loading');

      const plan = await getPlanStatus(user.id);
      if (!mounted) return;

      if (plan.state === 'no_plan') return setDestination('paywall');
      if (plan.state === 'unknown') return setDestination('loading');
      setDestination('dashboard');
    })();

    return () => {
      mounted = false;
    };
  }, [user, initializingSession]);

  return destination;
}
