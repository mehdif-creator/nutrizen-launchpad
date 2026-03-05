import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { SeoArticle } from './types';

const FINAL_STATUSES = new Set(['qa_done', 'published', 'failed']);

export function useSeoArticles() {
  const [articles, setArticles] = useState<SeoArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetch = useCallback(async () => {
    const { data } = await supabase
      .from('seo_articles')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setArticles(data as unknown as SeoArticle[]);
    setLoading(false);
    return data as unknown as SeoArticle[] | null;
  }, []);

  // Start/stop polling based on whether any article is in-progress
  useEffect(() => {
    fetch();
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [fetch]);

  useEffect(() => {
    const hasInProgress = articles.some(a => !FINAL_STATUSES.has(a.status));
    if (hasInProgress && !pollingRef.current) {
      pollingRef.current = setInterval(fetch, 5000);
    } else if (!hasInProgress && pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, [articles, fetch]);

  const deleteArticle = useCallback(async (id: string) => {
    await supabase.from('seo_articles').delete().eq('id', id);
    setArticles(prev => prev.filter(a => a.id !== id));
  }, []);

  return { articles, loading, refetch: fetch, deleteArticle };
}
