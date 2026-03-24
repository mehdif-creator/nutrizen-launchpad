import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, ImageIcon } from 'lucide-react';
import type { ManualSocialPost } from '@/hooks/useManualSocialPosts';
import { cn } from '@/lib/utils';

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  ready: { label: 'Prêt', className: 'bg-primary/15 text-primary border-primary/20' },
  posted: { label: 'Publié', className: 'bg-blue-500/15 text-blue-600 border-blue-500/20' },
  archived: { label: 'Archivé', className: 'bg-muted text-muted-foreground border-border' },
};

interface Props {
  posts: ManualSocialPost[];
  loading: boolean;
  error: string | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRetry: () => void;
}

export function ManualSocialPostsList({ posts, loading, error, selectedId, onSelect, onRetry }: Props) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Chargement…</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6 text-center">
        <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
        <p className="text-destructive font-medium mb-3">Erreur de chargement</p>
        <p className="text-sm text-muted-foreground mb-4">{error}</p>
        <Button variant="outline" size="sm" onClick={onRetry}>Réessayer</Button>
      </Card>
    );
  }

  if (posts.length === 0) {
    return (
      <Card className="p-8 text-center">
        <ImageIcon className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
        <p className="text-muted-foreground font-medium">Aucun post disponible</p>
        <p className="text-sm text-muted-foreground mt-1">Les posts apparaîtront ici une fois générés.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
      {posts.map(post => {
        const badge = STATUS_BADGE[post.status] || STATUS_BADGE.ready;
        const thumb = post.image_4x5_url || post.image_9x16_url;
        const hasFormats = !!(post.image_9x16_url && post.image_4x5_url);
        const isSelected = selectedId === post.id;

        return (
          <Card
            key={post.id}
            onClick={() => onSelect(post.id)}
            className={cn(
              'p-3 cursor-pointer transition-all hover:shadow-md',
              isSelected && 'ring-2 ring-primary shadow-md'
            )}
          >
            <div className="flex gap-3">
              {thumb ? (
                <img
                  src={thumb}
                  alt=""
                  className="w-14 h-14 rounded-md object-cover flex-shrink-0 bg-muted"
                />
              ) : (
                <div className="w-14 h-14 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                  <ImageIcon className="h-5 w-5 text-muted-foreground/50" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{post.title || 'Sans titre'}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className={cn('text-xs', badge.className)}>
                    {badge.label}
                  </Badge>
                  {post.platform_target && post.platform_target !== 'both' && (
                    <span className="text-xs text-muted-foreground capitalize">{post.platform_target}</span>
                  )}
                  {hasFormats && (
                    <span className="text-xs text-muted-foreground">2 formats</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(post.created_at).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
