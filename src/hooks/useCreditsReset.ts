import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { createLogger } from '@/lib/logger';

const logger = createLogger('useCreditsReset');

/**
 * Hook to check and apply credit reset on app load (fallback mechanism).
 * Throttled to run at most once per session.
 */
export function useCreditsReset(userId: string | undefined) {
  const hasChecked = useRef(false);

  useEffect(() => {
    if (!userId || hasChecked.current) return;

    const checkAndApplyReset = async () => {
      try {
        hasChecked.current = true;
        
        logger.debug('Checking credit reset for user');
        
        // Call the RPC to apply reset if due
        const { data, error } = await supabase.rpc('rpc_apply_credit_reset', {
          p_user_id: userId,
        });

        if (error) {
          logger.error('Error applying credit reset', error);
          return;
        }

        const result = data as Record<string, unknown> | null;
        const action = result?.action;
        if (action === 'reset_applied') {
          logger.info('Credit reset applied', { data: result });
        } else {
          logger.debug('No reset needed', { action });
        }
      } catch (error) {
        logger.error('Exception', error instanceof Error ? error : new Error(String(error)));
      }
    };

    // Small delay to not block initial render
    const timer = setTimeout(checkAndApplyReset, 1000);
    return () => clearTimeout(timer);
  }, [userId]);
}
