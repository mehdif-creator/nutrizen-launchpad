import { useState, useMemo } from 'react';
import { AppFooter } from '@/components/app/AppFooter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ArrowLeft, RefreshCw, FileText, Search, ImageIcon, Wrench } from 'lucide-react';
import { callEdgeFunction } from '@/lib/edgeFn';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { SeoCreateForm } from './seo/SeoCreateForm';
import { SeoArticleCard } from './seo/SeoArticleCard';
import { SeoArticleDetail } from './seo/SeoArticleDetail';
import { SeoKeywordExpander } from './seo/SeoKeywordExpander';
import { SeoQueueTab } from './seo/SeoQueueTab';
import { useSeoArticles } from './seo/useSeoArticles';
import type { SeoArticle } from './seo/types';
import { STATUS_LABELS } from './seo/types';

export default function AdminSeoFactory() {
  const { articles, loading, refetch, deleteArticle } = useSeoArticles();
  const [detailArticle, setDetailArticle] = useState<SeoArticle | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'date' | 'score' | 'status'>('date');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const { toast } = useToast();

  const handleRefreshAllImages = async () => {
    setIsRefreshing(true);
    try {
      const data = await callEdgeFunction<{
        refreshed_count?: number;
        total_processed?: number;
        errors?: string[];
        error?: string;
      }>('seo-image-refresh', { refresh_all: true });

      if (data?.error) throw new Error(data.error);

      const count = data?.refreshed_count ?? 0;
      const total = data?.total_processed ?? 0;
      toast({
        title: count > 0
          ? `✅ ${count} article(s) mis à jour sur ${total} traités`
          : `ℹ️ ${total} articles traités — aucune image expirée trouvée`,
      });

      if (data?.errors?.length) {
        toast({ title: `⚠️ ${data.errors.length} erreur(s)`, description: data.errors[0], variant: 'destructive' });
      }
      await refetch();
    } catch (err: any) {
      toast({ title: 'Erreur de régénération', description: err?.message || 'Erreur inconnue', variant: 'destructive' });
    } finally {
      setIsRefreshing(false);
    }
  };

  const filteredArticles = useMemo(() => {
    let list = articles;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(a => a.keyword.toLowerCase().includes(q));
    }
    if (statusFilter.length > 0) {
      list = list.filter(a => statusFilter.includes(a.status));
    }
    if (sortBy === 'score') {
      list = [...list].sort((a, b) => (b.qa_score ?? -1) - (a.qa_score ?? -1));
    }
    return list;
  }, [articles, search, statusFilter, sortBy]);

  const allStatuses = Object.keys(STATUS_LABELS);

  const toggleStatus = (s: string) => {
    setStatusFilter(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 container py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Link to="/admin">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          <h1 className="text-3xl font-bold flex-1">SEO Factory</h1>
          <Button variant="outline" size="sm" onClick={async () => {
            setIsCleaning(true);
            try {
              const data = await callEdgeFunction<{ total: number; fixed: number }>('seo-cleanup-articles', {});
              toast({ title: `🧹 ${data?.fixed || 0} article(s) nettoyé(s) sur ${data?.total || 0}` });
              await refetch();
            } catch (err: any) {
              toast({ title: 'Erreur nettoyage', description: err?.message, variant: 'destructive' });
            } finally { setIsCleaning(false); }
          }} disabled={isCleaning}>
            <Wrench className="mr-2 h-4 w-4" />
            {isCleaning ? 'Nettoyage…' : '🧹 Nettoyer'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefreshAllImages} disabled={isRefreshing}>
            <ImageIcon className="mr-2 h-4 w-4" />
            {isRefreshing ? 'Régénération…' : '🖼️ Images'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />Actualiser
          </Button>
        </div>

        {/* Main tabs */}
        <Tabs defaultValue="articles" className="space-y-6">
          <TabsList>
            <TabsTrigger value="articles">Articles</TabsTrigger>
            <TabsTrigger value="queue">File d'attente</TabsTrigger>
          </TabsList>

          {/* Articles tab */}
          <TabsContent value="articles" className="space-y-6">
            <SeoCreateForm onCreated={refetch} />
            <SeoKeywordExpander onArticleCreated={refetch} />

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un mot-clé…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-1.5 flex-wrap items-center">
                {allStatuses.map(s => (
                  <Button
                    key={s}
                    variant={statusFilter.includes(s) ? 'default' : 'outline'}
                    size="sm"
                    className="text-xs h-7 px-2"
                    onClick={() => toggleStatus(s)}
                  >
                    {STATUS_LABELS[s].label}
                  </Button>
                ))}
              </div>
              <select
                className="border rounded-md px-2 py-1 text-sm bg-background"
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
              >
                <option value="date">Plus récent</option>
                <option value="score">Score SEO</option>
                <option value="status">Statut</option>
              </select>
            </div>

            {/* Article list */}
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">Chargement…</div>
            ) : filteredArticles.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="mx-auto h-12 w-12 mb-3 opacity-40" />
                <p>{articles.length === 0 ? 'Aucun article SEO. Ajoutez un mot-clé pour démarrer.' : 'Aucun résultat pour ce filtre.'}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredArticles.map(a => (
                  <SeoArticleCard
                    key={a.id}
                    article={a}
                    onRefresh={refetch}
                    onDelete={deleteArticle}
                    onOpenDetail={setDetailArticle}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Queue tab */}
          <TabsContent value="queue">
            <SeoQueueTab />
          </TabsContent>
        </Tabs>
      </main>

      <AppFooter />

      <SeoArticleDetail
        article={detailArticle}
        open={detailArticle !== null}
        onClose={() => setDetailArticle(null)}
        onRefresh={() => { refetch(); }}
      />
    </div>
  );
}
