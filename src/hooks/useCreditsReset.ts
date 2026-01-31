import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
        
        console.log('[useCreditsReset] Checking credit reset for user');
        
        // Call the RPC to apply reset if due
        const { data, error } = await supabase.rpc('rpc_apply_credit_reset', {
          p_user_id: userId,
        });

        if (error) {
          console.error('[useCreditsReset] Error applying credit reset:', error);
          return;
        }

        const action = (data as any)?.action;
        if (action === 'reset_applied') {
          console.log('[useCreditsReset] Credit reset applied:', data);
        } else {
          console.log('[useCreditsReset] No reset needed:', action);
        }
      } catch (error) {
        console.error('[useCreditsReset] Exception:', error);
      }
    };

    // Small delay to not block initial render
    const timer = setTimeout(checkAndApplyReset, 1000);
    return () => clearTimeout(timer);
  }, [userId]);
}
