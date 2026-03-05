import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Rocket } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { callEdgeFunction } from '@/lib/edgeFn';
import { useToast } from '@/hooks/use-toast';

interface Props {
  onCreated: () => void;
}

export function SeoCreateForm({ onCreated }: Props) {
  const [keyword, setKeyword] = useState('');
  const [cluster, setCluster] = useState('');
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  const handleCreate = async () => {
    const kw = keyword.trim();
    if (!kw) return;
    setCreating(true);
    try {
      // 1. Insert row
      const { data, error } = await supabase
        .from('seo_articles')
        .insert({ keyword: kw, cluster_context: cluster.trim() || null })
        .select('id')
        .single();
      if (error) throw new Error(error.message);

      toast({ title: 'Article créé', description: `Lancement SERP pour « ${kw} »…` });

      // 2. Launch SERP research
      await callEdgeFunction('seo-serp-research', {
        keyword: kw,
        cluster_context: cluster.trim() || undefined,
        article_id: data.id,
      });

      toast({ title: 'SERP terminé', description: `Résultats SERP récupérés pour « ${kw} ».` });
      setKeyword('');
      setCluster('');
      onCreated();
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
      // Store error on article if we have an id
      onCreated();
    } finally {
      setCreating(false);
    }
  };

  return (
    <Card className="p-5 mb-6">
      <h2 className="font-semibold mb-3 text-lg">Nouveau mot-clé</h2>
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Mot-clé cible (ex: recette healthy rapide midi)"
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
          className="flex-1"
        />
        <Input
          placeholder="Contexte du cluster (optionnel)"
          value={cluster}
          onChange={e => setCluster(e.target.value)}
          className="flex-1 sm:max-w-xs"
        />
        <Button onClick={handleCreate} disabled={creating || !keyword.trim()}>
          {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Rocket className="mr-2 h-4 w-4" />}
          Ajouter et lancer
        </Button>
      </div>
    </Card>
  );
}
