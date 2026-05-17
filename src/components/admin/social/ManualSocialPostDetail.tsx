import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Copy,
  ExternalLink,
  Download,
  CheckCircle2,
  Archive,
  RotateCcw,
  FileText,
  ImageIcon,
  Globe,
  Sparkles,
  ClipboardCopy,
  ChefHat,
  ChevronDown,
  UtensilsCrossed,
  ListOrdered,
  Video,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ManualSocialPost } from '@/hooks/useManualSocialPosts';
import { getEffectiveDescription, getBoardName } from '@/hooks/useManualSocialPosts';
import {
  getIngredients,
  getPreparationSteps,
  hasRecipeData,
  formatIngredientsText,
  formatPreparationText,
  buildTikTokScript,
} from '@/lib/recipePostHelpers';

interface Props {
  post: ManualSocialPost | null;
  onMarkPosted: (id: string) => Promise<boolean>;
  onArchive: (id: string) => Promise<boolean>;
  onRestore: (id: string) => Promise<boolean>;
  onUpdateNotes: (id: string, notes: string) => Promise<boolean>;
  onGenerateDescription: (post: ManualSocialPost) => Promise<boolean>;
}

export function ManualSocialPostDetail({
  post,
  onMarkPosted,
  onArchive,
  onRestore,
  onUpdateNotes,
  onGenerateDescription,
}: Props) {
  const { toast } = useToast();
  const [notes, setNotes] = useState('');
  const [notesDirty, setNotesDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setNotes(post?.notes || '');
    setNotesDirty(false);
  }, [post?.id]);

  if (!post) {
    return (
      <Card className="p-12 text-center">
        <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
        <p className="text-muted-foreground font-medium">
          Sélectionnez un post pour voir les détails
        </p>
      </Card>
    );
  }

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Copié !', description: `${label} copié dans le presse-papiers` });
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de copier', variant: 'destructive' });
    }
  };

  const effectiveDesc = getEffectiveDescription(post);
  const websiteUrl = post.website_url || 'https://mynutrizen.fr/';

  const copyAll = async () => {
    const text = `${post.title || ''}\n\n${effectiveDesc}\n\n${websiteUrl}`;
    await copyToClipboard(text, 'Titre + description + URL');
  };

  const saveNotes = async () => {
    setSaving(true);
    await onUpdateNotes(post.id, notes);
    setNotesDirty(false);
    setSaving(false);
  };

  const downloadImage = (url: string, name: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.click();
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-xl">{post.title || 'Sans titre'}</CardTitle>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <StatusBadge status={post.status} />
              {post.platform_target && (
                <Badge variant="outline" className="text-xs capitalize">
                  {post.platform_target}
                </Badge>
              )}
              {post.source_workflow && (
                <span className="text-xs text-muted-foreground">via {post.source_workflow}</span>
              )}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={copyAll}>
            <ClipboardCopy className="mr-1.5 h-3.5 w-3.5" />
            Copier tout
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Metadata */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Créé le</span>
            <p className="font-medium">
              {new Date(post.created_at).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
          {post.posted_at && (
            <div>
              <span className="text-muted-foreground">Publié le</span>
              <p className="font-medium">
                {new Date(post.posted_at).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          )}
          <div>
            <span className="text-muted-foreground">Tableau</span>
            <p className="font-medium">{getBoardName(post)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Type de cuisine</span>
            <p className="font-medium">{post.cuisine_type || '—'}</p>
          </div>
        </div>

        <Separator />

        {/* Copy actions */}
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">Titre</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(post.title || '', 'Titre')}
              >
                <Copy className="mr-1.5 h-3.5 w-3.5" />
                Copier le titre
              </Button>
            </div>
            <p className="text-sm bg-muted rounded-md px-3 py-2">{post.title || 'Sans titre'}</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">Description</span>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => onGenerateDescription(post)}>
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  Générer la description par défaut
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(effectiveDesc, 'Description')}
                >
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                  Copier la description
                </Button>
              </div>
            </div>
            <p className="text-sm bg-muted rounded-md px-3 py-2 whitespace-pre-wrap">
              {effectiveDesc}
              {!post.description && (
                <span className="text-xs text-muted-foreground ml-2">
                  (générée automatiquement)
                </span>
              )}
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5" />
                URL du site
              </span>
              <Button variant="ghost" size="sm" onClick={() => copyToClipboard(websiteUrl, 'URL')}>
                <Copy className="mr-1.5 h-3.5 w-3.5" />
                Copier l'URL
              </Button>
            </div>
            <p className="text-sm bg-muted rounded-md px-3 py-2">{websiteUrl}</p>
          </div>
        </div>

        <Separator />

        {/* Image previews */}
        <div>
          <h3 className="text-sm font-medium mb-3">Visuels</h3>
          <Tabs defaultValue="9x16">
            <TabsList>
              <TabsTrigger value="9x16">Pinterest 9:16</TabsTrigger>
              <TabsTrigger value="4x5">Instagram 4:5</TabsTrigger>
            </TabsList>
            <TabsContent value="9x16">
              <ImagePreview
                url={post.image_9x16_url}
                label="Pinterest 9:16"
                emptyLabel="Aucun visuel Pinterest disponible"
                onDownload={() =>
                  post.image_9x16_url &&
                  downloadImage(post.image_9x16_url, `${post.title || 'post'}-9x16.jpg`)
                }
              />
            </TabsContent>
            <TabsContent value="4x5">
              <ImagePreview
                url={post.image_4x5_url}
                label="Instagram 4:5"
                emptyLabel="Aucun visuel Instagram disponible"
                onDownload={() =>
                  post.image_4x5_url &&
                  downloadImage(post.image_4x5_url, `${post.title || 'post'}-4x5.jpg`)
                }
              />
            </TabsContent>
          </Tabs>
          {post.image_9x16_url && post.image_4x5_url && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => {
                window.open(post.image_9x16_url!, '_blank');
                window.open(post.image_4x5_url!, '_blank');
              }}
            >
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              Ouvrir les deux images
            </Button>
          )}
        </div>

        {/* Recipe details */}
        <Separator />
        <RecipeSection post={post} onCopy={copyToClipboard} />

        <Separator />
        <div>
          <h3 className="text-sm font-medium mb-2">Notes internes</h3>
          <Textarea
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              setNotesDirty(true);
            }}
            placeholder="Ajoutez des notes sur ce post…"
            rows={3}
          />
          {notesDirty && (
            <Button size="sm" className="mt-2" onClick={saveNotes} disabled={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer les notes'}
            </Button>
          )}
        </div>

        <Separator />

        {/* Status actions */}
        <div className="flex flex-wrap gap-2">
          {post.status === 'ready' && (
            <>
              <Button onClick={() => onMarkPosted(post.id)} className="gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                Marquer comme publié
              </Button>
              <Button variant="outline" onClick={() => onArchive(post.id)} className="gap-1.5">
                <Archive className="h-4 w-4" />
                Archiver
              </Button>
            </>
          )}
          {post.status === 'posted' && (
            <Button variant="outline" onClick={() => onArchive(post.id)} className="gap-1.5">
              <Archive className="h-4 w-4" />
              Archiver
            </Button>
          )}
          {post.status === 'archived' && (
            <Button variant="outline" onClick={() => onRestore(post.id)} className="gap-1.5">
              <RotateCcw className="h-4 w-4" />
              Remettre en prêt
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    ready: { label: 'Prêt', className: 'bg-primary/15 text-primary' },
    posted: { label: 'Publié', className: 'bg-blue-500/15 text-blue-600' },
    archived: { label: 'Archivé', className: 'bg-muted text-muted-foreground' },
  };
  const b = map[status] || map.ready;
  return <Badge className={b.className}>{b.label}</Badge>;
}

function ImagePreview({
  url,
  label,
  emptyLabel,
  onDownload,
}: {
  url: string | null;
  label: string;
  emptyLabel: string;
  onDownload: () => void;
}) {
  if (!url) {
    return (
      <div className="flex flex-col items-center justify-center py-12 bg-muted/50 rounded-lg">
        <ImageIcon className="h-10 w-10 text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg overflow-hidden bg-muted max-h-[400px] flex items-center justify-center">
        <img src={url} alt={label} className="max-h-[400px] object-contain" />
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => window.open(url, '_blank')}>
          <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
          Ouvrir l'image
        </Button>
        <Button variant="outline" size="sm" onClick={onDownload}>
          <Download className="mr-1.5 h-3.5 w-3.5" />
          Télécharger
        </Button>
      </div>
    </div>
  );
}

function RecipeSection({
  post,
  onCopy,
}: {
  post: ManualSocialPost;
  onCopy: (text: string, label: string) => Promise<void>;
}) {
  const ingredients = getIngredients(post);
  const steps = getPreparationSteps(post);
  const recipeExists = ingredients.length > 0 || steps.length > 0;

  return (
    <Collapsible defaultOpen={recipeExists}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full text-left group">
        <ChefHat className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium flex-1">Recette</span>
        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3 space-y-4">
        {/* Ingredients */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-medium flex items-center gap-1.5">
              <UtensilsCrossed className="h-3.5 w-3.5" />
              Ingrédients
            </span>
            {ingredients.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onCopy(formatIngredientsText(post), 'Ingrédients')}
              >
                <Copy className="mr-1.5 h-3.5 w-3.5" />
                Copier les ingrédients
              </Button>
            )}
          </div>
          {ingredients.length > 0 ? (
            <ul className="text-sm bg-muted rounded-md px-4 py-2.5 space-y-1 list-disc list-inside">
              {ingredients.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground italic bg-muted/50 rounded-md px-3 py-2">
              Aucun ingrédient disponible
            </p>
          )}
        </div>

        {/* Preparation */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-medium flex items-center gap-1.5">
              <ListOrdered className="h-3.5 w-3.5" />
              Préparation
            </span>
            {steps.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onCopy(formatPreparationText(post), 'Préparation')}
              >
                <Copy className="mr-1.5 h-3.5 w-3.5" />
                Copier la préparation
              </Button>
            )}
          </div>
          {steps.length > 0 ? (
            <ol className="text-sm bg-muted rounded-md px-4 py-2.5 space-y-1 list-decimal list-inside">
              {steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground italic bg-muted/50 rounded-md px-3 py-2">
              Aucune préparation disponible
            </p>
          )}
        </div>

        {/* TikTok script */}
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => onCopy(buildTikTokScript(post), 'Script TikTok')}
        >
          <Video className="mr-1.5 h-4 w-4" />
          Copier script TikTok
        </Button>
      </CollapsibleContent>
    </Collapsible>
  );
}
