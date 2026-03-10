import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import {
  Loader2, Play, Trash2, RotateCcw, ExternalLink, Upload, Clock, AlertCircle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useArticleQueue } from './useArticleQueue';
import { useQueueProcessor } from './useQueueProcessor';
import { AUTO_PIPELINE_LABELS } from './types';
import { cn } from '@/lib/utils';

const CATEGORIES = [
  { value: '', label: 'Aucune' },
  { value: 'healthy', label: 'Healthy' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'famille', label: 'Famille' },
  { value: 'longue-traine', label: 'Longue traîne' },
  { value: 'autre', label: 'Autre' },
];

export function SeoQueueTab() {
  const { items, loading, stats, fetchItems, bulkInsert, deleteItem, retryItem, clearDone } = useArticleQueue();
  const { autoMode, toggleAutoMode, processing, processItem } = useQueueProcessor(fetchItems);
  const { toast } = useToast();

  const [bulkText, setBulkText] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState(5);
  const [importing, setImporting] = useState(false);

  const topicCount = useMemo(() => {
    return bulkText.split('\n').filter(l => l.trim().length > 0).length;
  }, [bulkText]);

  const handleImport = async () => {
    const topics = bulkText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (topics.length === 0) return;
    setImporting(true);
    try {
      const result = await bulkInsert(topics, category || null, priority);
      let msg = `${result.inserted} sujet(s) importé(s)`;
      if (result.duplicates > 0) msg += ` · ${result.duplicates} doublon(s) ignoré(s)`;
      if (result.existing.length > 0) msg += ` · ${result.existing.length} déjà publié(s) (avertissement)`;
      toast({ title: '✅ Import terminé', description: msg });
      setBulkText('');
    } catch (err: any) {
      toast({ title: 'Erreur d\'import', description: err.message, variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  };

  const estimatedHours = stats.pending * 8;

  return (
    <div className="space-y-6">
      {/* Processing progress card */}
      {processing.item && (
        <Card className="p-4 border-primary/30 bg-primary/5">
          <div className="flex items-center gap-2 mb-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="font-semibold">Traitement en cours…</span>
          </div>
          <p className="text-sm mb-3">
            Sujet : « {processing.item.topic} »
          </p>
          {/* Step progress */}
          <div className="flex items-center gap-1 mb-2">
            {AUTO_PIPELINE_LABELS.map((label, i) => {
              const isDone = i < processing.stepIndex;
              const isActive = i === processing.stepIndex;
              return (
                <div key={label} className="flex items-center gap-1">
                  {i > 0 && <div className={cn('h-0.5 w-3', isDone || isActive ? 'bg-primary' : 'bg-muted')} />}
                  <div className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded',
                    isDone ? 'bg-primary text-primary-foreground' :
                    isActive ? 'bg-primary/20 text-primary font-semibold' :
                    'bg-muted text-muted-foreground'
                  )}>
                    {label}
                  </div>
                </div>
              );
            })}
            {/* Publication step */}
            <div className="flex items-center gap-1">
              <div className={cn('h-0.5 w-3', processing.stepLabel === 'Publication' ? 'bg-primary' : 'bg-muted')} />
              <div className={cn(
                'text-[10px] px-1.5 py-0.5 rounded',
                processing.stepLabel === 'Publication' ? 'bg-primary/20 text-primary font-semibold' : 'bg-muted text-muted-foreground'
              )}>
                Publié
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Étape : {processing.stepLabel}
            {processing.startedAt && (
              <> · Démarré il y a {Math.round((Date.now() - processing.startedAt.getTime()) / 60000)} min</>
            )}
          </p>
        </Card>
      )}

      {/* Bulk import panel */}
      <Card className="p-5">
        <h3 className="font-semibold text-lg mb-3">Import en masse</h3>
        <Textarea
          placeholder={"Collez vos sujets, un par ligne :\n\nGratin de courgettes version légère\nCookies healthy : 3 versions\nComment cuisiner le tofu : 7 marinades"}
          value={bulkText}
          onChange={e => setBulkText(e.target.value)}
          className="min-h-[150px] font-mono text-sm"
        />
        <div className="flex flex-col sm:flex-row gap-3 mt-3 items-end">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1 block">Catégorie</label>
            <select
              className="border rounded-md px-3 py-2 text-sm bg-background w-full"
              value={category}
              onChange={e => setCategory(e.target.value)}
            >
              {CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="w-32">
            <label className="text-xs text-muted-foreground mb-1 block">Priorité (1–10)</label>
            <input
              type="number"
              min={1}
              max={10}
              value={priority}
              onChange={e => setPriority(Number(e.target.value))}
              className="border rounded-md px-3 py-2 text-sm bg-background w-full"
            />
          </div>
          <Button onClick={handleImport} disabled={importing || topicCount === 0}>
            {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Importer {topicCount} sujet{topicCount !== 1 ? 's' : ''}
          </Button>
        </div>
      </Card>

      {/* Controls bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch checked={autoMode} onCheckedChange={toggleAutoMode} />
            <span className="text-sm font-medium">
              {autoMode ? 'Traitement auto activé' : 'Traitement auto désactivé'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap text-sm">
          <Badge variant="secondary">{stats.pending} en attente</Badge>
          <Badge variant="default" className="bg-blue-600">{stats.processing} en cours</Badge>
          <Badge variant="default" className="bg-green-600">{stats.done} terminé{stats.done !== 1 ? 's' : ''}</Badge>
          {stats.error > 0 && <Badge variant="destructive">{stats.error} erreur{stats.error !== 1 ? 's' : ''}</Badge>}
          {stats.done > 0 && (
            <Button variant="outline" size="sm" onClick={clearDone}>
              Vider les terminés
            </Button>
          )}
        </div>
      </div>

      {/* Estimated time */}
      {stats.pending > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          Temps estimé pour traiter la file : ~{estimatedHours} heure{estimatedHours !== 1 ? 's' : ''}
        </div>
      )}

      {/* Queue table */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Chargement…</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>La file d'attente est vide. Importez des sujets ci-dessus.</p>
        </div>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sujet</TableHead>
                <TableHead className="w-28">Catégorie</TableHead>
                <TableHead className="w-20">Priorité</TableHead>
                <TableHead className="w-28">Statut</TableHead>
                <TableHead className="w-28">Créé le</TableHead>
                <TableHead className="w-36">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(item => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium max-w-[300px] truncate">
                    {item.topic}
                    {item.error_message && (
                      <div className="flex items-center gap-1 mt-1 text-destructive text-xs" title={item.error_message}>
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        <span className="truncate">{item.error_message}</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{item.category || '—'}</TableCell>
                  <TableCell className="text-sm font-mono">{item.priority}</TableCell>
                  <TableCell>
                    <StatusBadge status={item.status} articleId={item.article_id} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(item.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {item.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => processItem(item)}
                            disabled={processing.item !== null}
                            title="Lancer"
                          >
                            <Play className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => deleteItem(item.id)} title="Supprimer">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      {item.status === 'error' && (
                        <Button size="sm" variant="ghost" onClick={() => retryItem(item.id)} title="Réessayer">
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {item.status === 'done' && item.article_id && (
                        <Button size="sm" variant="ghost" asChild>
                          <a href={`/admin/seo-factory`} title="Voir l'article">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status, articleId }: { status: string; articleId: string | null }) {
  switch (status) {
    case 'pending':
      return <Badge variant="secondary">En attente</Badge>;
    case 'processing':
      return (
        <Badge variant="default" className="bg-blue-600 text-white">
          <Loader2 className="h-3 w-3 animate-spin mr-1" />En cours
        </Badge>
      );
    case 'done':
      return <Badge variant="default" className="bg-green-600 text-white">Terminé</Badge>;
    case 'error':
      return <Badge variant="destructive">Erreur</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}
