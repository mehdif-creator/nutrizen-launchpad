import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { subscribeToUserStats } from '@/lib/realtime';
import { queryClient } from '@/lib/queryClient';
import { createLogger } from '@/lib/logger';

const logger = createLogger('useDashboardStats');

export interface DashboardStats {
  temps_gagne: number;
  charge_mentale_pct: number;
  serie_en_cours_set_count: number;
  credits_zen: number;
  references_count: number;
  objectif_hebdos_valide: number;
}

const DEFAULT_STATS: DashboardStats = {
  temps_gagne: 0,
  charge_mentale_pct: 0,
  serie_en_cours_set_count: 0,
  credits_zen: 0,
  references_count: 0,
  objectif_hebdos_valide: 0,
};

async function fetchDashboardStats(userId: string): Promise<DashboardStats> {
  const { data, error } = await supabase
    .from('user_dashboard_stats')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    logger.error('Error fetching stats', error);
    throw error;
  }

  if (!data) {
    logger.warn('No stats found, returning defaults');
    return DEFAULT_STATS;
  }

  return {
    temps_gagne: data.temps_gagne ?? 0,
    charge_mentale_pct: data.charge_mentale_pct ?? 0,
    serie_en_cours_set_count: data.serie_en_cours_set_count ?? 0,
    credits_zen: data.credits_zen ?? 0,
    references_count: data.references_count ?? 0,
    objectif_hebdos_valide: data.objectif_hebdos_valide ?? 0,
  };
}

export function useDashboardStats(userId: string | undefined) {
  const query = useQuery({
    queryKey: ['dashboardStats', userId],
    queryFn: () => fetchDashboardStats(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    refetchOnMount: true,
    placeholderData: DEFAULT_STATS,
  });

  useEffect(() => {
    if (!userId) return;

    const unsubscribe = subscribeToUserStats(userId, () => {
      queryClient.invalidateQueries({ queryKey: ['dashboardStats', userId] });
    });

    const walletSubscription = supabase
      .channel(`user-wallet-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_wallets',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['dashboardStats', userId] });
        }
      )
      .subscribe();

    return () => {
      unsubscribe();
      walletSubscription.unsubscribe();
    };
  }, [userId]);

  return {
    ...query,
    stats: query.data ?? DEFAULT_STATS,
  };
}
