import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { queryClient } from '@/lib/queryClient';

/**
 * Hook to update user streak and dashboard stats on app mount
 * This should be called once when the user opens the app
 */
export function useStreakUpdate(userId: string | undefined) {
  const hasUpdated = useRef(false);

  useEffect(() => {
    if (!userId || hasUpdated.current) return;

    const updateStreak = async () => {
      try {
        const { data, error } = await supabase.rpc('update_user_streak_and_stats', {
          p_user_id: userId
        });

        if (error) {
          console.error('[useStreakUpdate] Error updating streak:', error);
          return;
        }

        console.log('[useStreakUpdate] Streak updated:', data);

        // Invalidate relevant queries to refetch data
        queryClient.invalidateQueries({ queryKey: ['dashboardStats', userId] });
        queryClient.invalidateQueries({ queryKey: ['gamification', userId] });
        
        hasUpdated.current = true;
      } catch (error) {
        console.error('[useStreakUpdate] Exception:', error);
      }
    };

    // Small delay to ensure auth is fully settled
    const timeout = setTimeout(updateStreak, 500);
    return () => clearTimeout(timeout);
  }, [userId]);
}
