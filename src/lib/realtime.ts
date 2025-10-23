import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Subscribe to user_weekly_menus changes for a specific user
 * Returns cleanup function
 */
export function subscribeToUserMenu(
  userId: string,
  onUpdate: (payload: any) => void
): () => void {
  const channel = supabase
    .channel(`user-menu-${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'user_weekly_menus',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        console.log('[Realtime] Menu update:', payload.eventType);
        onUpdate(payload);
      }
    )
    .subscribe((status) => {
      console.log('[Realtime] Subscription status:', status);
    });

  // Return cleanup function
  return () => {
    console.log('[Realtime] Unsubscribing from menu updates');
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to user_dashboard_stats changes for a specific user
 */
export function subscribeToUserStats(
  userId: string,
  onUpdate: (payload: any) => void
): () => void {
  const channel = supabase
    .channel(`user-stats-${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'user_dashboard_stats',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        console.log('[Realtime] Stats update:', payload.eventType);
        onUpdate(payload);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to user_gamification changes for a specific user
 */
export function subscribeToGamification(
  userId: string,
  onUpdate: (payload: any) => void
): () => void {
  const channel = supabase
    .channel(`user-gamification-${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'user_gamification',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        console.log('[Realtime] Gamification update:', payload.eventType);
        onUpdate(payload);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
