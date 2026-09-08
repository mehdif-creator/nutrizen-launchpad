import { Bell, BellOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/usePushNotifications';

interface PushToggleProps {
  title?: string;
  description?: string;
}

export function PushToggle({
  title = 'Alertes sur ce téléphone',
  description = "Recevez une alerte même quand l'application est fermée.",
}: PushToggleProps) {
  const { supported, enabled, loading, error, enable, disable } = usePushNotifications();

  if (!supported) {
    return (
      <div className="text-xs md:text-sm text-muted-foreground">
        Cet appareil ne gère pas les alertes. Sur iPhone, ajoutez d'abord NutriZen à l'écran
        d'accueil, puis rouvrez l'application depuis son icône.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div className="flex-1">
          <p className="text-sm md:text-base font-medium">{title}</p>
          <p className="text-xs md:text-sm text-muted-foreground">{description}</p>
        </div>
        <Button
          variant={enabled ? 'secondary' : 'default'}
          size="sm"
          className="whitespace-nowrap min-h-[44px]"
          disabled={loading}
          onClick={() => (enabled ? disable() : enable())}
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : enabled ? (
            <BellOff className="mr-2 h-4 w-4" />
          ) : (
            <Bell className="mr-2 h-4 w-4" />
          )}
          {enabled ? 'Désactiver' : 'Activer'}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
