import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { callEdgeFunction } from '@/lib/edgeFn';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { ExpandedKeyword } from './types';

interface Props {
  onArticleCreated: () => void;
}

export function SeoKeywordExpander({ onArticleCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [seed, setSeed] = useState('');
  const [cluster, setCluster] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ExpandedKeyword[]>([]);
  const [adding, setAdding] = useState<string | null>(null);
  const { toast } = useToast();

  const handleExpand = async () => {
    if (!seed.trim()) return;
    setLoading(true);
    try {
      const data = await callEdgeFunction<{ expanded_keywords?: ExpandedKeyword[] }>('seo-keyword-expand', {
        seed_keyword: seed.trim(),
        cluster_context: cluster.trim() || undefined,
        existing_keywords: [],
      });
      setResults(data.expanded_keywords ?? []);
      if (!data.expanded_keywords?.length) {
        toast({ title: 'Aucun résultat', description: 'L\'IA n\'a retourné aucun mot-clé.' });
      }
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (kw: ExpandedKeyword) => {
    setAdding(kw.keyword);
    try {
      const { error } = await supabase.from('seo_articles').insert({
        keyword: kw.keyword,
        cluster_context: cluster.trim() || null,
      });
      if (error) throw new Error(error.message);
      toast({ title: 'Ajouté', description: `« ${kw.keyword} » ajouté au pipeline.` });
      setResults(prev => prev.filter(r => r.keyword !== kw.keyword));
      onArticleCreated();
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    } finally {
      setAdding(null);
    }
  };

  const intentColors: Record<string, string> = {
    informational: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    commercial: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    transactional: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  };

  return (
    <Card className="p-4 mb-6">
      <button
        className="flex items-center gap-2 w-full text-left font-semibold text-lg"
        onClick={() => setOpen(!open)}
      >
        {open ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        Expansion de mots-clés
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input placeholder="Seed keyword" value={seed} onChange={e => setSeed(e.target.value)} className="flex-1" />
            <Input placeholder="Cluster context (optionnel)" value={cluster} onChange={e => setCluster(e.target.value)} className="flex-1 sm:max-w-xs" />
            <Button onClick={handleExpand} disabled={loading || !seed.trim()}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Générer
            </Button>
          </div>

          {results.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-2">Mot-clé</th>
                    <th className="py-2 pr-2">Intent</th>
                    <th className="py-2 pr-2">Funnel</th>
                    <th className="py-2 pr-2">Format</th>
                    <th className="py-2 pr-2">Score</th>
                    <th className="py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((kw) => (
                    <tr key={kw.keyword} className="border-b last:border-0">
                      <td className="py-2 pr-2 font-medium">{kw.keyword}</td>
                      <td className="py-2 pr-2">
                        <Badge variant="outline" className={intentColors[kw.intent] ?? ''}>{kw.intent}</Badge>
                      </td>
                      <td className="py-2 pr-2 capitalize">{kw.funnel_stage}</td>
                      <td className="py-2 pr-2">{kw.serp_format}</td>
                      <td className="py-2 pr-2 font-mono">{kw.estimated_priority}</td>
                      <td className="py-2">
                        <Button size="sm" variant="ghost" onClick={() => handleAdd(kw)} disabled={adding === kw.keyword}>
                          {adding === kw.keyword ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
