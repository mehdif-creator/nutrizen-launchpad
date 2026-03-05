import { useState, useEffect } from 'react';
import { AppFooter } from '@/components/app/AppFooter';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, RefreshCw, FileText, CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface SeoArticle {
  id: string;
  keyword: string;
  status: string;
  qa_score: number | null;
  qa_pass: boolean | null;
  created_at: string;
  updated_at: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'En attente', color: 'bg-muted text-muted-foreground' },
  serp_done: { label: 'SERP OK', color: 'bg-blue-100 text-blue-800' },
  brief_done: { label: 'Brief OK', color: 'bg-blue-100 text-blue-800' },
  outline_done: { label: 'Outline OK', color: 'bg-blue-100 text-blue-800' },
  images_done: { label: 'Images OK', color: 'bg-blue-100 text-blue-800' },
  draft_done: { label: 'Brouillon OK', color: 'bg-yellow-100 text-yellow-800' },
  qa_done: { label: 'QA terminé', color: 'bg-green-100 text-green-800' },
  published: { label: 'Publié', color: 'bg-green-200 text-green-900' },
  failed: { label: 'Échec', color: 'bg-red-100 text-red-800' },
};

export default function AdminSeoFactory() {
  const [articles, setArticles] = useState<SeoArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyword, setNewKeyword] = useState('');
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  const fetchArticles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('seo_articles')
      .select('id, keyword, status, qa_score, qa_pass, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Erreur', description: 'Impossible de charger les articles SEO', variant: 'destructive' });
    } else {
      setArticles(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchArticles(); }, []);

  const handleCreate = async () => {
    const keyword = newKeyword.trim();
    if (!keyword) return;
    setCreating(true);
    const { error } = await supabase.from('seo_articles').insert({ keyword });
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      setNewKeyword('');
      toast({ title: 'Article créé', description: `Mot-clé « ${keyword} » ajouté au pipeline.` });
      fetchArticles();
    }
    setCreating(false);
  };

  const statusInfo = (status: string) => STATUS_LABELS[status] ?? { label: status, color: 'bg-muted text-muted-foreground' };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 container py-8 max-w-5xl">
        <div className="mb-6 flex items-center gap-4">
          <Link to="/admin">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          <h1 className="text-3xl font-bold flex-1">SEO Factory</h1>
          <Button variant="outline" size="sm" onClick={fetchArticles}>
            <RefreshCw className="mr-2 h-4 w-4" />Actualiser
          </Button>
        </div>

        {/* Create new article */}
        <Card className="p-4 mb-6">
          <h2 className="font-semibold mb-3">Nouveau mot-clé</h2>
          <div className="flex gap-3">
            <Input
              placeholder="Ex: recette healthy rapide midi"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              className="flex-1"
            />
            <Button onClick={handleCreate} disabled={creating || !newKeyword.trim()}>
              {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Ajouter
            </Button>
          </div>
        </Card>

        {/* Articles list */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Chargement…</div>
        ) : articles.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="mx-auto h-12 w-12 mb-3 opacity-40" />
            <p>Aucun article SEO. Ajoutez un mot-clé pour démarrer le pipeline.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {articles.map((a) => {
              const si = statusInfo(a.status);
              return (
                <Card key={a.id} className="p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{a.keyword}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(a.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <Badge className={`${si.color} border-0`}>{si.label}</Badge>
                  {a.qa_score !== null && (
                    <span className="text-sm font-mono">
                      {a.qa_pass ? <CheckCircle className="inline h-4 w-4 text-green-600 mr-1" /> : <AlertCircle className="inline h-4 w-4 text-red-500 mr-1" />}
                      {a.qa_score}/100
                    </span>
                  )}
                  {a.status !== 'published' && a.status !== 'failed' && a.status !== 'qa_done' && (
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </main>
      <AppFooter />
    </div>
  );
}
