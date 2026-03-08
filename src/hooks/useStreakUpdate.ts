import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { queryClient } from '@/lib/queryClient';
import { createLogger } from '@/lib/logger';

const logger = createLogger('useStreakUpdate');

/**
 * Hook to emit a daily APP_OPEN gamification event on app mount.
 * Uses the unified fn_emit_gamification_event which handles:
 * - Points (via gamification_point_rules)
 * - Streak tracking (Europe/Paris timezone)
 * - Wallet sync
 * - Idempotency
 */
export function useStreakUpdate(userId: string | undefined) {
  const hasUpdated = useRef(false);

  useEffect(() => {
    if (!userId || hasUpdated.current) return;

    const updateStreak = async () => {
      try {
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' });
        
        const { data, error } = await (supabase.rpc as Function)(
          'fn_emit_gamification_event',
          {
            p_event_type: 'APP_OPEN',
            p_meta: {},
            p_idempotency_key: `app_open:${userId}:${today}`,
          }
        );

        if (error) {
          logger.error('Error updating streak', error);
          return;
        }

        logger.debug('Streak updated via V2', { data });

        // Invalidate relevant queries to refetch data
        queryClient.invalidateQueries({ queryKey: ['gamification-state', userId] });
        queryClient.invalidateQueries({ queryKey: ['gamification-events', userId] });
        queryClient.invalidateQueries({ queryKey: ['gamification-dashboard', userId] });
        queryClient.invalidateQueries({ queryKey: ['dashboardStats', userId] });
        
        hasUpdated.current = true;
      } catch (error) {
        logger.error('Exception', error instanceof Error ? error : new Error(String(error)));
      }
    };

    // Small delay to ensure auth is fully settled
    const timeout = setTimeout(updateStreak, 500);
    return () => clearTimeout(timeout);
  }, [userId]);
}
