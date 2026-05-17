import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { createLogger } from '@/lib/logger';

const logger = createLogger('BootstrapHealth');

export interface BootstrapHealth {
  healthy: boolean;
  profile: boolean;
  wallet: boolean;
  stats: boolean;
  preferences: boolean;
}

export type BootstrapState = 'loading' | 'healthy' | 'incomplete' | 'error';

const DEFAULT_HEALTH: BootstrapHealth = {
  healthy: false,
  profile: false,
  wallet: false,
  stats: false,
  preferences: false,
};

/**
 * Check bootstrap health for the current user.
 * Calls the lightweight `check_user_bootstrap_health` RPC.
 */
export function useBootstrapHealth(userId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['bootstrapHealth', userId],
    queryFn: async (): Promise<BootstrapHealth> => {
      const { data, error } = await (supabase.rpc as Function)('check_user_bootstrap_health', {
        p_user_id: userId,
      });

      if (error) {
        logger.error('Health check failed', error);
        throw error;
      }

      return data as BootstrapHealth;
    },
    enabled: !!userId,
    staleTime: 60_000, // 1 minute
    retry: 2,
  });

  const health = query.data ?? DEFAULT_HEALTH;

  const state: BootstrapState = query.isLoading
    ? 'loading'
    : query.isError
      ? 'error'
      : health.healthy
        ? 'healthy'
        : 'incomplete';

  // Repair mutation
  const repair = useMutation({
    mutationFn: async () => {
      const { data, error } = await (supabase.rpc as Function)('repair_user_bootstrap', {
        p_user_id: userId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bootstrapHealth', userId] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats', userId] });
      queryClient.invalidateQueries({ queryKey: ['userDashboard', userId] });
      queryClient.invalidateQueries({ queryKey: ['gamification-state', userId] });
    },
    onError: (err) => {
      logger.error('Repair failed', err);
    },
  });

  return {
    health,
    state,
    isLoading: query.isLoading,
    isError: query.isError,
    repair: () => repair.mutate(),
    isRepairing: repair.isPending,
    repairResult: repair.data,
  };
}
