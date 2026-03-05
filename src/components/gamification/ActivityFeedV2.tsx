import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useRecentGamificationEvents, usePointRules } from '@/hooks/useGamificationV2';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Zap } from 'lucide-react';

export function ActivityFeedV2() {
  const { data: events = [], isLoading: eventsLoading } = useRecentGamificationEvents(10);
  const { data: rules = [] } = usePointRules();

  const getLabel = (eventType: string): string => {
    return rules.find((r) => r.event_type === eventType)?.label_fr ?? eventType;
  };

  if (eventsLoading) {
    return (
      <Card className="p-4">
        <h3 className="font-semibold mb-3">Activité récente</h3>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  if (events.length === 0) {
    return (
      <Card className="p-4">
        <h3 className="font-semibold mb-3">Activité récente</h3>
        <p className="text-sm text-muted-foreground text-center py-4">
          Aucune activité pour le moment. Commence à utiliser NutriZen !
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-3">Activité récente</h3>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {events.map((event) => (
          <div
            key={event.id}
            className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50"
          >
            <div className="flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 text-primary" />
              <span className="text-sm">{getLabel(event.event_type)}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-primary">
                +{event.xp_delta} pts
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(event.created_at!), {
                  addSuffix: true,
                  locale: fr,
                })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
