import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface QueueItem {
  id: string;
  topic: string;
  target_keyword: string | null;
  status: string;
  priority: number;
  category: string | null;
  error_message: string | null;
  article_id: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface QueueStats {
  pending: number;
  processing: number;
  done: number;
  error: number;
}

export function useArticleQueue() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('article_queue')
      .select('*')
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) {
      console.error('article_queue fetch error:', error);
    }
    setItems((data ?? []) as unknown as QueueItem[]);
    setLoading(false);
    return (data ?? []) as unknown as QueueItem[];
  }, []);

  useEffect(() => {
    fetchItems();
    pollingRef.current = setInterval(fetchItems, 5000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [fetchItems]);

  const stats: QueueStats = {
    pending: items.filter(i => i.status === 'pending').length,
    processing: items.filter(i => i.status === 'processing').length,
    done: items.filter(i => i.status === 'done').length,
    error: items.filter(i => i.status === 'error').length,
  };

  const bulkInsert = async (
    topics: string[],
    category: string | null,
    priority: number
  ): Promise<{ inserted: number; duplicates: number; existing: string[] }> => {
    // Check for duplicates in queue
    const { data: existingQueue } = await supabase
      .from('article_queue')
      .select('topic, status')
      .in('status', ['pending', 'processing', 'done']);

    const existingTopics = new Set(
      ((existingQueue as any[]) || []).map((q: any) => q.topic.toLowerCase().trim())
    );

    // Check for existing articles by keyword
    const { data: existingArticles } = await supabase
      .from('seo_articles')
      .select('keyword');

    const existingKeywords = new Set(
      ((existingArticles as any[]) || []).map((a: any) => a.keyword.toLowerCase().trim())
    );

    const toInsert: { topic: string; category: string | null; priority: number }[] = [];
    let duplicates = 0;
    const existingWarnings: string[] = [];

    for (const topic of topics) {
      const normalized = topic.toLowerCase().trim();
      if (existingTopics.has(normalized)) {
        duplicates++;
        continue;
      }
      if (existingKeywords.has(normalized)) {
        existingWarnings.push(topic);
      }
      toInsert.push({ topic: topic.trim(), category, priority });
    }

    if (toInsert.length > 0) {
      // Insert in batches of 500 to avoid payload limits
      for (let i = 0; i < toInsert.length; i += 500) {
        const batch = toInsert.slice(i, i + 500);
        const { error } = await supabase.from('article_queue').insert(batch);
        if (error) console.error('bulk insert error:', error);
      }
    }

    // Force refresh after insert
    await fetchItems();
    return { inserted: toInsert.length, duplicates, existing: existingWarnings };
  };

  const deleteItem = async (id: string) => {
    await supabase.from('article_queue').delete().eq('id', id);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const retryItem = async (id: string) => {
    await supabase
      .from('article_queue')
      .update({ status: 'pending', error_message: null, started_at: null })
      .eq('id', id);
    await fetchItems();
  };

  const clearDone = async () => {
    await supabase.from('article_queue').delete().eq('status', 'done');
    await fetchItems();
  };

  return { items, loading, stats, fetchItems, bulkInsert, deleteItem, retryItem, clearDone };
}
