/**
 * Centralized onboarding status management
 * Single source of truth: onboarding_completed_at timestamp
 */
import { supabase } from '@/integrations/supabase/client';
import { createLogger } from '@/lib/logger';

const logger = createLogger('Onboarding');

export type OnboardingState = 'loading' | 'needs_onboarding' | 'onboarded' | 'error';

export interface OnboardingStatus {
  state: OnboardingState;
  completedAt: string | null;
  step: number;
  errorMessage?: string;
}

// In-memory cache to prevent repeated queries during navigation
const statusCache = new Map<string, { status: OnboardingStatus; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds

/**
 * Get onboarding status for a user
 * Uses onboarding_completed_at as the canonical field
 * Returns 'error' state on failure instead of silently assuming onboarded
 */
export async function getOnboardingStatus(userId: string): Promise<OnboardingStatus> {
  // Check cache first
  const cached = statusCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.status;
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('onboarding_completed_at, onboarding_step')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      logger.error('Error fetching status', error);
      // Return error state — caller must handle this explicitly
      return { state: 'error', completedAt: null, step: 0, errorMessage: error.message };
    }

    // No profile row - needs onboarding
    if (!data) {
      const status: OnboardingStatus = { state: 'needs_onboarding', completedAt: null, step: 0 };
      statusCache.set(userId, { status, timestamp: Date.now() });
      return status;
    }

    // Single source of truth: onboarding_completed_at is set = onboarded
    const completedAt = data.onboarding_completed_at;
    const step = data.onboarding_step ?? 0;

    const status: OnboardingStatus = {
      state: completedAt ? 'onboarded' : 'needs_onboarding',
      completedAt,
      step,
    };

    statusCache.set(userId, { status, timestamp: Date.now() });
    return status;
  } catch (error) {
    logger.error('Exception fetching status', error instanceof Error ? error : new Error(String(error)));
    // Return error state — do NOT silently assume onboarded
    return {
      state: 'error',
      completedAt: null,
      step: 0,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Mark onboarding as complete
 * Sets all relevant fields for backwards compatibility
 */
export async function markOnboardingComplete(userId: string): Promise<boolean> {
  try {
    const now = new Date().toISOString();

    const { error } = await supabase
      .from('profiles')
      .update({
        onboarding_completed_at: now,
        onboarding_completed: true,
        onboarding_status: 'completed',
        onboarding_step: 4,
        onboarding_version: 1,
        required_fields_ok: true,
      })
      .eq('id', userId);

    if (error) {
      logger.error('Error marking complete', error);
      return false;
    }

    // Clear cache to force refresh
    statusCache.delete(userId);

    logger.info('Marked complete', { userId });
    return true;
  } catch (error) {
    logger.error('Exception marking complete', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Clear the status cache (useful after updates)
 */
export function clearOnboardingCache(userId?: string): void {
  if (userId) {
    statusCache.delete(userId);
  } else {
    statusCache.clear();
  }
}

/**
 * Check if user is onboarded (sync check against cache)
 * Returns null if not in cache (caller should await getOnboardingStatus)
 */
export function isOnboardedCached(userId: string): boolean | null {
  const cached = statusCache.get(userId);
  if (!cached || Date.now() - cached.timestamp >= CACHE_TTL) {
    return null;
  }
  return cached.status.state === 'onboarded';
}
