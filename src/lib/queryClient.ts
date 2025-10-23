import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 0,
    },
  },
});

// Persist cache to sessionStorage to avoid flashes on navigation
if (typeof window !== 'undefined') {
  const CACHE_KEY = 'nutrizen-query-cache';
  
  // Load persisted cache on mount
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      queryClient.setQueryData(['persisted'], parsed);
    }
  } catch (error) {
    console.warn('Failed to load query cache:', error);
  }

  // Save cache on unmount/page hide
  const persistCache = () => {
    try {
      const cache = queryClient.getQueryCache().getAll();
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.warn('Failed to persist query cache:', error);
    }
  };

  window.addEventListener('beforeunload', persistCache);
  window.addEventListener('pagehide', persistCache);
}
