import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Trash2, Play, Zap, ExternalLink, AlertCircle, RotateCcw, ImageIcon } from 'lucide-react';
import { callEdgeFunction } from '@/lib/edgeFn';
import { supabase } from '@/integrations/supabase/client';
// supabase import already present for functions.invoke
import { useToast } from '@/hooks/use-toast';
import { SeoProgressBar } from './SeoProgressBar';
import { STATUS_LABELS, NEXT_STEP, AUTO_PIPELINE_SEQUENCE, AUTO_PIPELINE_LABELS } from './types';
import type { SeoArticle } from './types';
import { cn } from '@/lib/utils';

interface Props {
  article: SeoArticle;
  onRefresh: () => void;
  onDelete: (id: string) => void;
  onOpenDetail: (article: SeoArticle) => void;
}

export function SeoArticleCard({ article, onRefresh, onDelete, onOpenDetail }: Props) {
  const [busy, setBusy] = useState<string | null>(null); // edge fn name currently running
  const [autoPipeline, setAutoPipeline] = useState(false);
  const [autoStep, setAutoStep] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { toast } = useToast();

  const si = STATUS_LABELS[article.status] ?? STATUS_LABELS['pending'];

  const qaStatusOverride = article.status === 'qa_done' && article.qa_pass === false
    ? { label: 'QA Échoué', variant: 'destructive' as const, className: '' }
    : null;
  const displayStatus = qaStatusOverride ?? si;

  const scoreColor = article.qa_score != null
    ? article.qa_score >= 75 ? 'bg-green-600' : article.qa_score >= 60 ? 'bg-orange-500' : 'bg-red-600'
    : '';

  const autoImproveLoop = async (articleId: string) => {
    for (let attempt = 1; attempt <= 3; attempt++) {
      toast({ title: `Amélioration automatique en cours… (tentative ${attempt}/3)` });
      setBusy('seo-improve');
      await new Promise(r => setTimeout(r, 2000));
      try {
        await callEdgeFunction('seo-improve', { article_id: articleId });
        await callEdgeFunction('seo-qa', { article_id: articleId });
      } catch (e: any) {
        toast({ title: 'Erreur amélioration', description: e.message, variant: 'destructive' });
        break;
      }
      onRefresh();
      // Re-fetch article to check result
      const { data: updated } = await supabase.from('seo_articles').select('qa_pass, qa_score, improve_attempts').eq('id', articleId).single();
      if (updated?.qa_pass === true) {
        toast({ title: `✅ Article amélioré et validé — Score : ${updated.qa_score}/100` });
        setBusy(null);
        onRefresh();
        return;
      }
      if (attempt >= 3) {
        toast({ title: 'Révision manuelle requise', description: '3 tentatives échouées.', variant: 'destructive' });
      }
    }
    setBusy(null);
    onRefresh();
  };

  const callStep = async (fnName: string, payload: Record<string, unknown>, label: string) => {
    setBusy(fnName);
    toast({ title: `En cours : ${label}…` });
    try {
      const result = await callEdgeFunction(fnName, payload);
      toast({ title: `${label} terminé ✓` });
      onRefresh();
      // Auto-improve if QA failed
      if (fnName === 'seo-qa' && result && (result as any).pass_fail === 'fail') {
        await autoImproveLoop(payload.article_id as string);
        return;
      }
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
      onRefresh();
    } finally {
      setBusy(null);
    }
  };

  const nextStep = NEXT_STEP[article.status];

  const handleNextStep = () => {
    if (!nextStep) return;
    callStep(nextStep.fn, nextStep.payload(article), nextStep.label);
  };

  const handleImprove = async () => {
    setBusy('seo-improve');
    toast({ title: 'Amélioration en cours…' });
    try {
      await callEdgeFunction('seo-improve', { article_id: article.id });
      toast({ title: 'Amélioration appliquée, relance du QA…' });
      await callEdgeFunction('seo-qa', { article_id: article.id });
      toast({ title: 'QA terminé ✓' });
      onRefresh();
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
      onRefresh();
    } finally {
      setBusy(null);
    }
  };

  const handlePublish = async () => {
    setBusy('publish');
    try {
      await supabase
        .from('seo_articles')
        .update({ status: 'published' } as any)
        .eq('id', article.id);
      toast({ title: 'Article publié ✓' });
      onRefresh();
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  const handleAutoPipeline = async () => {
    setAutoPipeline(true);
    const statusToSeqIdx: Record<string, number> = {
      pending: 0, serp_done: 1, brief_done: 2, outline_done: 3, images_done: 4, draft_done: 5,
    };
    let startIdx = statusToSeqIdx[article.status] ?? 0;

    try {
      for (let i = startIdx; i < AUTO_PIPELINE_SEQUENCE.length; i++) {
        const fn = AUTO_PIPELINE_SEQUENCE[i];
        const label = AUTO_PIPELINE_LABELS[i];
        setAutoStep(label);
        const payload: Record<string, unknown> = { article_id: article.id };
        if (fn === 'seo-serp-research') {
          payload.keyword = article.keyword;
          payload.cluster_context = article.cluster_context;
        }
        if (fn === 'seo-draft') {
          payload.cta_url = window.location.origin;
        }
        const result = await callEdgeFunction(fn, payload);
        onRefresh();

        // After QA, auto-improve if failed
        if (fn === 'seo-qa' && result && (result as any).pass_fail === 'fail') {
          setAutoStep('Amélioration auto');
          await autoImproveLoop(article.id);
        }
      }
      toast({ title: 'Pipeline terminé ✓', description: `QA finalisé pour « ${article.keyword} ».` });
    } catch (e: any) {
      toast({ title: 'Pipeline interrompu', description: e.message, variant: 'destructive' });
    } finally {
      setAutoPipeline(false);
      setAutoStep('');
      onRefresh();
    }
  };

  const handleRetry = () => {
    // Find which step corresponds to current status and re-run the next one
    if (nextStep) handleNextStep();
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    onDelete(article.id);
  };

  const isBusy = busy !== null || autoPipeline;

  return (
    <Card
      className="p-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => !isBusy && onOpenDetail(article)}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold truncate text-base">{article.keyword}</p>
            <Badge variant={displayStatus.variant} className={cn('border-0 text-white text-xs', displayStatus.className)}>
              {displayStatus.label}
            </Badge>
            {article.qa_score != null && (
              <Badge className={cn('border-0 text-white text-xs', scoreColor)}>
                SEO : {article.qa_score}/100
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {new Date(article.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
            {article.cluster_context && <> · Cluster : {article.cluster_context}</>}
          </p>

          {article.error_message && (
            <div className="flex items-center gap-1 mt-2 text-destructive text-xs">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{article.error_message}</span>
            </div>
          )}

          <SeoProgressBar status={article.status} />

          {autoPipeline && (
            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Pipeline auto : {autoStep}…
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
          {/* Next step button */}
          {nextStep && !autoPipeline && (
            <Button size="sm" variant="default" onClick={handleNextStep} disabled={isBusy}>
              {busy === nextStep.fn ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Play className="mr-1 h-3.5 w-3.5" />}
              {nextStep.label}
            </Button>
          )}

          {/* Manual improve - only when auto-improve exhausted */}
          {article.status === 'qa_done' && article.qa_pass === false && (article.improve_attempts ?? 0) < 3 && (
            <Button size="sm" variant="outline" onClick={handleImprove} disabled={isBusy}>
              {busy === 'seo-improve' ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="mr-1 h-3.5 w-3.5" />}
              Améliorer ({article.improve_attempts ?? 0}/3)
            </Button>
          )}

          {/* Revision manuelle requise after 3 failed attempts */}
          {article.status === 'qa_done' && article.qa_pass === false && (article.improve_attempts ?? 0) >= 3 && (
            <Button size="sm" variant="outline" className="border-orange-400 text-orange-600" onClick={handlePublish} disabled={isBusy}>
              {busy === 'publish' ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
              ⚠️ Forcer la publication
            </Button>
          )}

          {/* Publish */}
          {article.status === 'qa_done' && article.qa_pass === true && (
            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={handlePublish} disabled={isBusy}>
              {busy === 'publish' ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
              Publier
            </Button>
          )}

          {/* View published */}
          {article.status === 'published' && article.blog_post_id && (
            <Button size="sm" variant="outline" asChild>
              <a href={`/blog/${article.blog_post_id}`} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-1 h-3.5 w-3.5" />Voir
              </a>
            </Button>
          )}

          {/* Auto pipeline */}
          {!['qa_done', 'published', 'failed'].includes(article.status) && !autoPipeline && (
            <Button size="sm" variant="secondary" onClick={handleAutoPipeline} disabled={isBusy}>
              <Zap className="mr-1 h-3.5 w-3.5" />Auto
            </Button>
          )}

          {/* Retry on error */}
          {article.error_message && (
            <Button size="sm" variant="outline" onClick={handleRetry} disabled={isBusy}>
              <RotateCcw className="mr-1 h-3.5 w-3.5" />Réessayer
            </Button>
          )}

          {/* Refresh images per article */}
          {article.image_urls && (
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                setBusy('seo-image-refresh');
                try {
                  console.log('[admin] Calling seo-image-refresh for article:', article.id);

                  const data = await callEdgeFunction<{
                    refreshed_count?: number;
                    total_processed?: number;
                    errors?: string[];
                    error?: string;
                  }>('seo-image-refresh', { article_id: article.id });

                  if (data?.error) throw new Error(data.error);

                  toast({
                    title:
                      (data?.refreshed_count ?? 0) > 0
                        ? '🖼️ Images régénérées ✓'
                        : 'ℹ️ Aucune image expirée détectée',
                  });

                  if (data?.errors?.length) {
                    toast({
                      title: `⚠️ ${data.errors.length} erreur(s)`,
                      description: data.errors[0],
                      variant: 'destructive',
                    });
                  }

                  onRefresh();
                } catch (e: any) {
                  toast({
                    title: 'Erreur de régénération',
                    description: e?.message || 'Erreur inconnue',
                    variant: 'destructive',
                  });
                } finally {
                  setBusy(null);
                }
              }}
              disabled={isBusy}
            >
              {busy === 'seo-image-refresh' ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="mr-1 h-3.5 w-3.5" />}
              Images
            </Button>
          )}

          {/* Delete */}
          <Button
            size="sm"
            variant={confirmDelete ? 'destructive' : 'ghost'}
            onClick={handleDelete}
            disabled={isBusy}
          >
            <Trash2 className="mr-1 h-3.5 w-3.5" />
            {confirmDelete ? 'Confirmer' : 'Suppr.'}
          </Button>
        </div>
      </div>
    </Card>
  );
}
