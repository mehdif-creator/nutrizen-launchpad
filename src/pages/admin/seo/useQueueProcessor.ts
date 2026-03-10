import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { callEdgeFunction } from '@/lib/edgeFn';
import { useToast } from '@/hooks/use-toast';
import type { QueueItem } from './useArticleQueue';
import { AUTO_PIPELINE_SEQUENCE, AUTO_PIPELINE_LABELS } from './types';

const LS_KEY = 'seo-queue-auto-processing';
const DELAY_BETWEEN_ITEMS_MS = 30_000;

export interface ProcessingState {
  item: QueueItem | null;
  stepIndex: number;
  stepLabel: string;
  startedAt: Date | null;
}

export function useQueueProcessor(refetchQueue: () => Promise<any>) {
  const [autoMode, setAutoMode] = useState(() => {
    try { return localStorage.getItem(LS_KEY) === 'true'; } catch { return false; }
  });
  const [processing, setProcessing] = useState<ProcessingState>({
    item: null, stepIndex: -1, stepLabel: '', startedAt: null,
  });
  const abortRef = useRef(false);
  const runningRef = useRef(false);
  const { toast } = useToast();

  const toggleAutoMode = useCallback((on: boolean) => {
    setAutoMode(on);
    try { localStorage.setItem(LS_KEY, String(on)); } catch {}
    if (!on) abortRef.current = true;
  }, []);

  const processOneItem = useCallback(async (item: QueueItem) => {
    // Mark as processing
    await supabase
      .from('article_queue' as any)
      .update({ status: 'processing', started_at: new Date().toISOString() } as any)
      .eq('id', item.id);

    // 1. Create seo_articles row
    const { data: articleRow, error: insertErr } = await supabase
      .from('seo_articles')
      .insert({ keyword: item.topic, cluster_context: item.category || null })
      .select('id')
      .single();

    if (insertErr || !articleRow) {
      throw new Error(insertErr?.message || 'Failed to create seo_articles row');
    }

    const articleId = articleRow.id;

    // Link article_id
    await supabase
      .from('article_queue' as any)
      .update({ article_id: articleId } as any)
      .eq('id', item.id);

    // Run pipeline steps
    for (let i = 0; i < AUTO_PIPELINE_SEQUENCE.length; i++) {
      if (abortRef.current) throw new Error('Queue processing stopped');

      const fn = AUTO_PIPELINE_SEQUENCE[i];
      const label = AUTO_PIPELINE_LABELS[i];

      setProcessing(prev => ({
        ...prev,
        stepIndex: i,
        stepLabel: label,
      }));

      const payload: Record<string, unknown> = { article_id: articleId };
      if (fn === 'seo-serp-research') {
        payload.keyword = item.topic;
        payload.cluster_context = item.category || undefined;
      }
      if (fn === 'seo-draft') {
        payload.cta_url = window.location.origin;
      }

      const result = await callEdgeFunction(fn, payload);

      // After QA, auto-improve if failed (up to 3 tries)
      if (fn === 'seo-qa' && result && (result as any).pass_fail === 'fail') {
        for (let attempt = 1; attempt <= 3; attempt++) {
          if (abortRef.current) throw new Error('Queue processing stopped');
          setProcessing(prev => ({ ...prev, stepLabel: `Amélioration (${attempt}/3)` }));
          await callEdgeFunction('seo-improve', { article_id: articleId });
          const qaResult = await callEdgeFunction('seo-qa', { article_id: articleId });
          if ((qaResult as any).pass_fail === 'pass') break;
        }
      }
    }

    // Publish
    setProcessing(prev => ({ ...prev, stepLabel: 'Publication' }));
    await supabase
      .from('seo_articles')
      .update({ status: 'published' } as any)
      .eq('id', articleId);

    // Mark queue item done
    await supabase
      .from('article_queue' as any)
      .update({ status: 'done', completed_at: new Date().toISOString() } as any)
      .eq('id', item.id);
  }, []);

  const runQueue = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    abortRef.current = false;

    try {
      while (true) {
        if (abortRef.current) break;

        // Fetch next pending item
        const { data } = await supabase
          .from('article_queue' as any)
          .select('*')
          .eq('status', 'pending')
          .order('priority', { ascending: true })
          .order('created_at', { ascending: true })
          .limit(1);

        const nextItem = (data as unknown as QueueItem[] | null)?.[0];
        if (!nextItem) break;

        setProcessing({
          item: nextItem,
          stepIndex: 0,
          stepLabel: AUTO_PIPELINE_LABELS[0],
          startedAt: new Date(),
        });

        try {
          await processOneItem(nextItem);
          toast({ title: `✅ « ${nextItem.topic} » terminé` });
        } catch (err: any) {
          if (err.message === 'Queue processing stopped') break;
          console.error('[queue] Error processing item:', err);
          await supabase
            .from('article_queue' as any)
            .update({ status: 'error', error_message: err.message?.slice(0, 500) } as any)
            .eq('id', nextItem.id);
          toast({
            title: `❌ Erreur : ${nextItem.topic}`,
            description: err.message?.slice(0, 100),
            variant: 'destructive',
          });
        }

        await refetchQueue();

        // Wait 30s between items
        if (!abortRef.current) {
          await new Promise(r => setTimeout(r, DELAY_BETWEEN_ITEMS_MS));
        }
      }
    } finally {
      setProcessing({ item: null, stepIndex: -1, stepLabel: '', startedAt: null });
      runningRef.current = false;
    }
  }, [processOneItem, refetchQueue, toast]);

  // Auto-start when toggle is ON
  useEffect(() => {
    if (autoMode && !runningRef.current) {
      runQueue();
    }
    if (!autoMode) {
      abortRef.current = true;
    }
  }, [autoMode, runQueue]);

  // Process single item manually
  const processItem = useCallback(async (item: QueueItem) => {
    setProcessing({
      item,
      stepIndex: 0,
      stepLabel: AUTO_PIPELINE_LABELS[0],
      startedAt: new Date(),
    });
    try {
      await processOneItem(item);
      toast({ title: `✅ « ${item.topic} » terminé` });
    } catch (err: any) {
      await supabase
        .from('article_queue' as any)
        .update({ status: 'error', error_message: err.message?.slice(0, 500) } as any)
        .eq('id', item.id);
      toast({
        title: `❌ Erreur : ${item.topic}`,
        description: err.message?.slice(0, 100),
        variant: 'destructive',
      });
    } finally {
      setProcessing({ item: null, stepIndex: -1, stepLabel: '', startedAt: null });
      await refetchQueue();
    }
  }, [processOneItem, refetchQueue, toast]);

  return { autoMode, toggleAutoMode, processing, processItem, isRunning: runningRef.current };
}
