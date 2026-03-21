import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  getOnboardingStatus,
  markOnboardingComplete as markComplete,
  clearOnboardingCache,
  type OnboardingState,
} from '@/lib/onboarding/status';
import { createLogger } from '@/lib/logger';

const logger = createLogger('OnboardingGuard');

export interface OnboardingGuardResult {
  state: OnboardingState;
  completedAt: string | null;
  step: number;
  errorMessage?: string;
}

/**
 * Hook to guard routes based on onboarding status.
 * Uses centralized status from lib/onboarding/status.ts
 * Single source of truth: onboarding_completed_at timestamp
 *
 * IMPORTANT: returns 'error' state on DB failures instead of
 * silently assuming 'onboarded' (fail-open removed).
 */
export function useOnboardingGuard(userId: string | undefined): OnboardingGuardResult {
  const [result, setResult] = useState<OnboardingGuardResult>({
    state: 'loading',
    completedAt: null,
    step: 0,
  });
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!userId) return;

    let mounted = true;
    let retryCount = 0;
    const MAX_RETRIES = 2;

    const checkStatus = async () => {
      const status = await getOnboardingStatus(userId);

      if (!mounted) return;

      // On error, retry up to MAX_RETRIES before surfacing the error
      if (status.state === 'error' && retryCount < MAX_RETRIES) {
        retryCount++;
        clearOnboardingCache(userId);
        logger.warn(`Onboarding check failed, retry ${retryCount}/${MAX_RETRIES}`);
        setTimeout(checkStatus, 1500);
        return;
      }

      setResult({
        state: status.state,
        completedAt: status.completedAt,
        step: status.step,
        errorMessage: status.errorMessage,
      });

      // Only redirect if we have a definitive answer
      if (status.state === 'needs_onboarding') {
        const isOnboardingPage = location.pathname === '/app/onboarding';
        const isAuthPage = location.pathname.startsWith('/auth/');

        if (!isOnboardingPage && !isAuthPage) {
          logger.debug('Needs onboarding, redirecting');
          navigate('/app/onboarding', { replace: true });
        }
      }
      // 'error' state is NOT redirected — ProtectedRoute handles it
    };

    checkStatus();

    return () => {
      mounted = false;
    };
  }, [userId, navigate, location.pathname]);

  return result;
}

/**
 * Hook for the onboarding page itself
 * Redirects away if already completed
 */
export function useOnboardingPageGuard(userId: string | undefined): OnboardingGuardResult {
  const [result, setResult] = useState<OnboardingGuardResult>({
    state: 'loading',
    completedAt: null,
    step: 0,
  });
  const navigate = useNavigate();

  useEffect(() => {
    if (!userId) return;

    let mounted = true;

    const checkStatus = async () => {
      const status = await getOnboardingStatus(userId);

      if (!mounted) return;

      setResult({
        state: status.state,
        completedAt: status.completedAt,
        step: status.step,
        errorMessage: status.errorMessage,
      });

      // If already onboarded, redirect to dashboard
      if (status.state === 'onboarded') {
        logger.debug('Already onboarded, redirecting to dashboard');
        navigate('/app/dashboard', { replace: true });
      }
      // On error: stay on onboarding page (safe default for this guard)
    };

    checkStatus();

    return () => {
      mounted = false;
    };
  }, [userId, navigate]);

  return result;
}

/**
 * Re-export the centralized completeOnboarding function
 */
export const completeOnboarding = markComplete;

/**
 * Re-export cache clearing
 */
export { clearOnboardingCache };

/**
 * Legacy helper for compatibility - updates step/status in progress
 */
export async function updateOnboardingStatus(
  userId: string,
  updates: {
    status?: 'not_started' | 'in_progress' | 'completed';
    step?: number;
    required_fields_ok?: boolean;
  }
): Promise<void> {
  const { supabase } = await import('@/integrations/supabase/client');
  const updateData: Record<string, unknown> = {};

  if (updates.status !== undefined) {
    updateData.onboarding_status = updates.status;
    if (updates.status === 'completed') {
      await markComplete(userId);
      return;
    }
  }

  if (updates.step !== undefined) {
    updateData.onboarding_step = updates.step;
  }

  if (updates.required_fields_ok !== undefined) {
    updateData.required_fields_ok = updates.required_fields_ok;
  }

  if (Object.keys(updateData).length === 0) return;

  const { error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', userId);

  if (error) {
    console.error('[updateOnboardingStatus] Error:', error);
    throw error;
  }

  clearOnboardingCache(userId);
}
