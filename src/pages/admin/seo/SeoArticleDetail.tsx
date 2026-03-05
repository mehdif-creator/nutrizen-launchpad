import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/app/Progress';
import type { SeoArticle } from './types';
import { cn } from '@/lib/utils';

interface Props {
  article: SeoArticle | null;
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export function SeoArticleDetail({ article, open, onClose, onRefresh }: Props) {
  const [editHtml, setEditHtml] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  if (!article) return null;

  const qa = article.qa_result as any;
  const serpData = article.serp_snapshot as any[];
  const images = article.image_urls as any;

  const handleSaveHtml = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('seo_articles')
      .update({ draft_html: editHtml } as any)
      .eq('id', article.id);
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'HTML sauvegardé ✓' });
      onRefresh();
    }
    setSaving(false);
  };

  const severityColor = (s: string) =>
    s === 'critical' ? 'text-destructive' : s === 'warning' ? 'text-orange-500' : 'text-blue-500';

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{article.keyword}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="content" className="mt-2">
          <TabsList className="w-full justify-start flex-wrap h-auto gap-1">
            <TabsTrigger value="content">Contenu</TabsTrigger>
            <TabsTrigger value="qa" disabled={!qa}>QA Report</TabsTrigger>
            <TabsTrigger value="serp" disabled={!serpData}>Données SERP</TabsTrigger>
            <TabsTrigger value="images" disabled={!images}>Images</TabsTrigger>
          </TabsList>

          {/* Content tab */}
          <TabsContent value="content" className="space-y-4">
            {article.draft_html ? (
              <>
                <div className="border rounded-md p-4 prose prose-sm max-w-none dark:prose-invert overflow-auto max-h-96"
                  dangerouslySetInnerHTML={{ __html: article.draft_html }}
                />
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm text-muted-foreground">Éditer le HTML</summary>
                  <Textarea
                    className="mt-2 font-mono text-xs min-h-[200px]"
                    defaultValue={article.draft_html}
                    onChange={e => setEditHtml(e.target.value)}
                  />
                  <Button size="sm" className="mt-2" onClick={handleSaveHtml} disabled={saving}>
                    Sauvegarder le HTML
                  </Button>
                </details>
              </>
            ) : (
              <p className="text-muted-foreground text-sm">Aucun brouillon généré.</p>
            )}
          </TabsContent>

          {/* QA Report tab */}
          <TabsContent value="qa" className="space-y-4">
            {qa ? (
              <>
                <div className="flex items-center gap-3">
                  <span className="text-4xl font-bold">{qa.seo_score ?? article.qa_score ?? '—'}</span>
                  <span className="text-lg text-muted-foreground">/100</span>
                  {article.qa_pass !== null && (
                    <Badge variant={article.qa_pass ? 'default' : 'destructive'} className={article.qa_pass ? 'bg-green-600 text-white' : ''}>
                      {article.qa_pass ? 'PASS' : 'FAIL'}
                    </Badge>
                  )}
                </div>

                {/* Category scores */}
                {qa.category_scores && (
                  <div className="grid gap-3 mt-3">
                    {Object.entries(qa.category_scores as Record<string, number>).map(([key, val]) => (
                      <div key={key}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                          <span className="font-mono">{val}/100</span>
                        </div>
                        <Progress value={val} />
                      </div>
                    ))}
                  </div>
                )}

                {/* Issues */}
                {qa.issues && (qa.issues as any[]).length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-semibold text-sm mb-2">Problèmes</h4>
                    <ul className="space-y-1">
                      {(qa.issues as any[]).map((issue: any, i: number) => (
                        <li key={i} className={cn('text-sm', severityColor(issue.severity))}>
                          <span className="font-medium">[{issue.severity}]</span> {issue.message}
                          {issue.suggestion && <span className="text-muted-foreground"> — {issue.suggestion}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Strengths */}
                {qa.strengths && (qa.strengths as string[]).length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-semibold text-sm mb-2">Points forts</h4>
                    <ul className="list-disc pl-5 space-y-0.5 text-sm text-green-700 dark:text-green-400">
                      {(qa.strengths as string[]).map((s: string, i: number) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                )}

                {/* Badges */}
                <div className="flex gap-2 mt-3 flex-wrap">
                  {qa.duplicate_risk_score != null && (
                    <Badge variant="outline">Dup. risk : {qa.duplicate_risk_score}</Badge>
                  )}
                  {qa.medical_risk && (
                    <Badge variant="destructive">⚠ Risque médical</Badge>
                  )}
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-sm">QA non encore exécuté.</p>
            )}
          </TabsContent>

          {/* SERP data tab */}
          <TabsContent value="serp" className="space-y-4">
            {article.paa_questions && article.paa_questions.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2">Questions PAA</h4>
                <ul className="list-disc pl-5 space-y-0.5 text-sm">
                  {article.paa_questions.map((q, i) => <li key={i}>{q}</li>)}
                </ul>
              </div>
            )}
            {serpData && Array.isArray(serpData) && (
              <div>
                <h4 className="font-semibold text-sm mb-2">Top 10 résultats organiques</h4>
                <div className="space-y-2">
                  {serpData.map((r: any, i: number) => (
                    <div key={i} className="text-sm border rounded p-2">
                      <p className="font-medium">{r.position}. {r.title}</p>
                      <p className="text-muted-foreground text-xs truncate">{r.link}</p>
                      {r.snippet && <p className="text-xs mt-1">{r.snippet}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {article.related_keywords && article.related_keywords.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2">Recherches associées</h4>
                <div className="flex flex-wrap gap-1">
                  {article.related_keywords.map((k, i) => (
                    <Badge key={i} variant="outline" className="text-xs">{k}</Badge>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Images tab */}
          <TabsContent value="images" className="space-y-4">
            {images && Array.isArray(images) ? (
              <div className="grid grid-cols-2 gap-4">
                {images.map((img: any, i: number) => (
                  <div key={i} className="space-y-1">
                    <img src={img.url || img} alt={img.alt || `Image ${i + 1}`} className="rounded-md w-full object-cover" />
                    {img.alt && <p className="text-xs text-muted-foreground">{img.alt}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Aucune image générée.</p>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
