/**
 * Hook for admin macros maintenance operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchMacrosCoverage,
  fetchMacrosQueueCount,
  adminProcessQueue,
  adminProcessQueueBatch,
  adminRefreshMV2,
  MacrosCoverage,
} from '@/lib/macros';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface UseMacrosAdminResult {
  // Data
  coverage: MacrosCoverage | null;
  queueCount: number;
  
  // Loading states
  isLoadingCoverage: boolean;
  isLoadingQueue: boolean;
  isProcessing: boolean;
  isRefreshing: boolean;
  
  // Actions
  processQueue: (limit?: number) => Promise<void>;
  processBatch: (batchSize?: number) => Promise<void>;
  refreshMV2: () => Promise<void>;
  refreshStats: () => void;
}

export function useMacrosAdmin(): UseMacrosAdminResult {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();

  // Fetch coverage stats
  const { 
    data: coverage, 
    isLoading: isLoadingCoverage,
    refetch: refetchCoverage,
  } = useQuery({
    queryKey: ['macros-coverage'],
    queryFn: fetchMacrosCoverage,
    enabled: isAdmin,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // 1 minute auto-refresh
  });

  // Fetch queue count
  const { 
    data: queueCount = 0, 
    isLoading: isLoadingQueue,
    refetch: refetchQueue,
  } = useQuery({
    queryKey: ['macros-queue-count'],
    queryFn: fetchMacrosQueueCount,
    enabled: isAdmin,
    staleTime: 10 * 1000, // 10 seconds
    refetchInterval: 30 * 1000, // 30 seconds auto-refresh
  });

  // Process queue mutation
  const processQueueMutation = useMutation({
    mutationFn: async (limit: number) => {
      return adminProcessQueue(limit);
    },
    onSuccess: (processed) => {
      toast({
        title: 'Queue traitée',
        description: `${processed} recette(s) traitée(s).`,
      });
      // Refresh stats after processing
      queryClient.invalidateQueries({ queryKey: ['macros-coverage'] });
      queryClient.invalidateQueries({ queryKey: ['macros-queue-count'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Batch process mutation
  const processBatchMutation = useMutation({
    mutationFn: async (batchSize: number) => {
      return adminProcessQueueBatch(batchSize, 5, 1000);
    },
    onSuccess: ({ totalProcessed, iterations }) => {
      toast({
        title: 'Traitement par lots terminé',
        description: `${totalProcessed} recette(s) traitée(s) en ${iterations} itération(s).`,
      });
      queryClient.invalidateQueries({ queryKey: ['macros-coverage'] });
      queryClient.invalidateQueries({ queryKey: ['macros-queue-count'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Refresh MV2 mutation
  const refreshMV2Mutation = useMutation({
    mutationFn: adminRefreshMV2,
    onSuccess: ({ message }) => {
      toast({
        title: 'Vue matérialisée actualisée',
        description: message || 'recipe_macros_mv2 a été rafraîchie.',
      });
      queryClient.invalidateQueries({ queryKey: ['macros-coverage'] });
      queryClient.invalidateQueries({ queryKey: ['recipe-macros-page'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const processQueue = async (limit: number = 200) => {
    await processQueueMutation.mutateAsync(limit);
  };

  const processBatch = async (batchSize: number = 200) => {
    await processBatchMutation.mutateAsync(batchSize);
  };

  const refreshMV2 = async () => {
    await refreshMV2Mutation.mutateAsync();
  };

  const refreshStats = () => {
    refetchCoverage();
    refetchQueue();
  };

  return {
    coverage: coverage || null,
    queueCount,
    isLoadingCoverage,
    isLoadingQueue,
    isProcessing: processQueueMutation.isPending || processBatchMutation.isPending,
    isRefreshing: refreshMV2Mutation.isPending,
    processQueue,
    processBatch,
    refreshMV2,
    refreshStats,
  };
}
