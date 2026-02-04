/**
 * Onboarding Completion Logic - SINGLE SOURCE OF TRUTH
 * 
 * Canonical field: onboarding_completed_at (TIMESTAMP)
 * - NULL → onboarding NOT completed
 * - NOT NULL → onboarding completed
 * 
 * This is the ONLY file that determines onboarding completion status.
 */

import { supabase } from '@/integrations/supabase/client';

export interface OnboardingState {
  /** Tri-state loading indicator */
  loading: boolean;
  /** Whether onboarding is completed (server truth) */
  completed: boolean;
  /** Timestamp when onboarding was completed (NULL if not completed) */
  completedAt: string | null;
  /** Error if fetch failed */
  error: string | null;
}

const DEV_MODE = import.meta.env.DEV;

function debugLog(message: string, data?: unknown) {
  if (DEV_MODE) {
    console.log(`[Onboarding] ${message}`, data !== undefined ? data : '');
  }
}

/**
 * Fetch the onboarding completion state for a user.
 * Uses ONLY onboarding_completed_at as the source of truth.
 */
export async function getOnboardingState(userId: string): Promise<OnboardingState> {
  if (!userId) {
    debugLog('No userId provided');
    return { loading: false, completed: false, completedAt: null, error: 'No user ID' };
  }

  try {
    debugLog('Fetching onboarding state for:', userId);
    
    const { data, error } = await supabase
      .from('user_profiles')
      .select('onboarding_completed_at')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      debugLog('Error fetching profile:', error.message);
      // PGRST116 = row not found - user needs onboarding
      if (error.code === 'PGRST116') {
        return { loading: false, completed: false, completedAt: null, error: null };
      }
      return { loading: false, completed: false, completedAt: null, error: error.message };
    }

    // No profile = needs onboarding
    if (!data) {
      debugLog('No profile found - needs onboarding');
      return { loading: false, completed: false, completedAt: null, error: null };
    }

    const completedAt = data.onboarding_completed_at;
    const completed = completedAt !== null;

    debugLog('Onboarding state:', { completed, completedAt });

    return {
      loading: false,
      completed,
      completedAt,
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    debugLog('Exception:', message);
    return { loading: false, completed: false, completedAt: null, error: message };
  }
}

/**
 * Mark onboarding as complete for a user.
 * Sets onboarding_completed_at to current timestamp.
 */
export async function markOnboardingComplete(userId: string): Promise<boolean> {
  if (!userId) {
    debugLog('Cannot complete onboarding: no userId');
    return false;
  }

  try {
    debugLog('Marking onboarding complete for:', userId);

    const { error } = await supabase
      .from('user_profiles')
      .update({
        onboarding_completed_at: new Date().toISOString(),
        // Keep legacy fields in sync for backwards compatibility
        onboarding_completed: true,
        onboarding_status: 'completed',
        onboarding_version: 1,
        required_fields_ok: true,
      })
      .eq('id', userId);

    if (error) {
      debugLog('Error completing onboarding:', error.message);
      return false;
    }

    debugLog('Onboarding marked complete');
    return true;
  } catch (err) {
    debugLog('Exception completing onboarding:', err);
    return false;
  }
}

/**
 * Reset onboarding for a user (admin/debug only).
 * Clears onboarding_completed_at to NULL.
 */
export async function resetOnboarding(userId: string): Promise<boolean> {
  if (!userId) {
    debugLog('Cannot reset onboarding: no userId');
    return false;
  }

  try {
    debugLog('Resetting onboarding for:', userId);

    const { error } = await supabase
      .from('user_profiles')
      .update({
        onboarding_completed_at: null,
        onboarding_completed: false,
        onboarding_status: 'not_started',
        onboarding_step: 0,
        required_fields_ok: false,
      })
      .eq('id', userId);

    if (error) {
      debugLog('Error resetting onboarding:', error.message);
      return false;
    }

    debugLog('Onboarding reset complete');
    return true;
  } catch (err) {
    debugLog('Exception resetting onboarding:', err);
    return false;
  }
}

/**
 * Check if a user should be redirected to onboarding.
 * Returns true if onboarding is NOT complete and user should be redirected.
 */
export async function shouldRedirectToOnboarding(userId: string): Promise<boolean> {
  const state = await getOnboardingState(userId);
  
  // Don't redirect if there's an error (fail open to not block users)
  if (state.error) {
    debugLog('Error checking onboarding - failing open');
    return false;
  }
  
  return !state.completed;
}
