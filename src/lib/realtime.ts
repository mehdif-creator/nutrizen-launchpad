import { supabase } from '@/integrations/supabase/client';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { createLogger } from '@/lib/logger';

const logger = createLogger('Realtime');

type RealtimePayload = RealtimePostgresChangesPayload<Record<string, unknown>>;

/**
 * Subscribe to user_weekly_menus changes for a specific user
 * Returns cleanup function
 */
export function subscribeToUserMenu(
  userId: string,
  onUpdate: (payload: RealtimePayload) => void
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
        logger.debug('Menu update', { eventType: payload.eventType });
        onUpdate(payload);
      }
    )
    .subscribe((status) => {
      logger.debug('Subscription status', { status });
    });

  // Return cleanup function
  return () => {
    logger.debug('Unsubscribing from menu updates');
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to user_dashboard_stats changes for a specific user
 */
export function subscribeToUserStats(
  userId: string,
  onUpdate: (payload: RealtimePayload) => void
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
        logger.debug('Stats update', { eventType: payload.eventType });
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
  onUpdate: (payload: RealtimePayload) => void
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
        logger.debug('Gamification update', { eventType: payload.eventType });
        onUpdate(payload);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
