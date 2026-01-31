import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface LastUpdatedBadgeProps {
  timestamp: string | null;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export function LastUpdatedBadge({ timestamp, onRefresh, isRefreshing }: LastUpdatedBadgeProps) {
  const formattedTime = timestamp
    ? formatDistanceToNow(parseISO(timestamp), { addSuffix: true, locale: fr })
    : 'maintenant';

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span>Mis à jour {formattedTime}</span>
      <Button
        variant="ghost"
        size="sm"
        onClick={onRefresh}
        disabled={isRefreshing}
        className="h-6 px-2"
      >
        <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
        <span className="ml-1">Actualiser</span>
      </Button>
    </div>
  );
}
