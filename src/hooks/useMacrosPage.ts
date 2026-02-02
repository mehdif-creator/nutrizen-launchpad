/**
 * Hook for cursor-based pagination of recipe macros
 */

import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchRecipeMacrosPage, RecipeMacro } from '@/lib/macros';
import { useToast } from '@/hooks/use-toast';

interface UseMacrosPageOptions {
  limit?: number;
  enabled?: boolean;
}

interface UseMacrosPageResult {
  items: RecipeMacro[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: Error | null;
  loadMore: () => Promise<void>;
  refresh: () => void;
}

export function useMacrosPage(options: UseMacrosPageOptions = {}): UseMacrosPageResult {
  const { limit = 25, enabled = true } = options;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [items, setItems] = useState<RecipeMacro[]>([]);
  const [lastRecipeId, setLastRecipeId] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Initial load
  const { isLoading, error, refetch } = useQuery({
    queryKey: ['recipe-macros-page', 'initial'],
    queryFn: async () => {
      const result = await fetchRecipeMacrosPage(null, limit);
      setItems(result.data);
      setLastRecipeId(result.lastRecipeId);
      setHasMore(result.hasMore);
      return result;
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Load more (cursor-based)
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore || !lastRecipeId) return;

    setIsLoadingMore(true);
    try {
      const result = await fetchRecipeMacrosPage(lastRecipeId, limit);
      setItems(prev => [...prev, ...result.data]);
      setLastRecipeId(result.lastRecipeId);
      setHasMore(result.hasMore);
    } catch (err) {
      console.error('Error loading more macros:', err);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger plus de données.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoadingMore, lastRecipeId, limit, toast]);

  // Refresh (reset to first page)
  const refresh = useCallback(() => {
    setItems([]);
    setLastRecipeId(null);
    setHasMore(true);
    queryClient.invalidateQueries({ queryKey: ['recipe-macros-page'] });
    refetch();
  }, [queryClient, refetch]);

  return {
    items,
    isLoading,
    isLoadingMore,
    hasMore,
    error: error as Error | null,
    loadMore,
    refresh,
  };
}
