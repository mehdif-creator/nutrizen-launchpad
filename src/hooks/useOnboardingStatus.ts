/**
 * useOnboardingStatus - Single source of truth hook for onboarding state
 * 
 * This hook:
 * 1. Fetches onboarding status using only onboarding_completed_at
 * 2. Handles loading states properly
 * 3. Caches the result to prevent redundant fetches
 * 4. Provides methods to complete/reset onboarding
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getOnboardingState,
  markOnboardingComplete,
  resetOnboarding,
  OnboardingState,
} from '@/lib/onboarding/isOnboardingComplete';

export interface UseOnboardingStatusResult {
  /** Whether we're still loading the onboarding state */
  loading: boolean;
  /** Whether onboarding is completed */
  completed: boolean;
  /** Timestamp when onboarding was completed (null if not completed) */
  completedAt: string | null;
  /** Any error that occurred during fetch */
  error: string | null;
  /** Mark onboarding as complete */
  completeOnboarding: () => Promise<boolean>;
  /** Reset onboarding (for testing/admin) */
  resetOnboarding: () => Promise<boolean>;
  /** Refetch the onboarding state */
  refetch: () => Promise<void>;
}

export function useOnboardingStatus(userId: string | undefined): UseOnboardingStatusResult {
  const [state, setState] = useState<OnboardingState>({
    loading: true,
    completed: false,
    completedAt: null,
    error: null,
  });

  // Track if we've already fetched to prevent duplicate fetches
  const hasFetched = useRef(false);
  const currentUserId = useRef<string | undefined>(undefined);

  const fetchStatus = useCallback(async () => {
    if (!userId) {
      setState({ loading: false, completed: false, completedAt: null, error: null });
      return;
    }

    setState(prev => ({ ...prev, loading: true }));
    
    const result = await getOnboardingState(userId);
    
    setState({
      loading: false,
      completed: result.completed,
      completedAt: result.completedAt,
      error: result.error,
    });
  }, [userId]);

  useEffect(() => {
    // Reset if userId changes
    if (userId !== currentUserId.current) {
      currentUserId.current = userId;
      hasFetched.current = false;
    }

    if (!userId) {
      setState({ loading: false, completed: false, completedAt: null, error: null });
      return;
    }

    // Only fetch once per userId
    if (hasFetched.current) {
      return;
    }

    hasFetched.current = true;
    fetchStatus();
  }, [userId, fetchStatus]);

  const handleCompleteOnboarding = useCallback(async () => {
    if (!userId) return false;
    
    const success = await markOnboardingComplete(userId);
    
    if (success) {
      // Update local state immediately
      setState(prev => ({
        ...prev,
        completed: true,
        completedAt: new Date().toISOString(),
      }));
    }
    
    return success;
  }, [userId]);

  const handleResetOnboarding = useCallback(async () => {
    if (!userId) return false;
    
    const success = await resetOnboarding(userId);
    
    if (success) {
      // Update local state immediately
      setState(prev => ({
        ...prev,
        completed: false,
        completedAt: null,
      }));
      hasFetched.current = false;
    }
    
    return success;
  }, [userId]);

  const refetch = useCallback(async () => {
    hasFetched.current = false;
    await fetchStatus();
  }, [fetchStatus]);

  return {
    loading: state.loading,
    completed: state.completed,
    completedAt: state.completedAt,
    error: state.error,
    completeOnboarding: handleCompleteOnboarding,
    resetOnboarding: handleResetOnboarding,
    refetch,
  };
}
