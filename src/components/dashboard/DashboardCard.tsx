import { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CardState = 'loading' | 'ready' | 'empty' | 'error';

interface DashboardCardProps {
  title: string;
  icon?: ReactNode;
  state: CardState;
  children: ReactNode;
  className?: string;
  // Empty state
  emptyMessage?: string;
  emptyAction?: {
    label: string;
    onClick: () => void;
    loading?: boolean;
  };
  // Error state
  errorMessage?: string;
  onRetry?: () => void;
  retrying?: boolean;
}

export function DashboardCard({
  title,
  icon,
  state,
  children,
  className,
  emptyMessage = 'Aucune donnée disponible.',
  emptyAction,
  errorMessage = 'Impossible de charger ces données.',
  onRetry,
  retrying,
}: DashboardCardProps) {
  return (
    <Card className={cn('rounded-2xl border shadow-sm p-4 md:p-5', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm md:text-base font-semibold flex items-center gap-2">
          {icon}
          {title}
        </h3>
      </div>

      {/* Content based on state */}
      {state === 'loading' && (
        <div className="space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
          <p className="text-xs text-muted-foreground mt-2">Chargement…</p>
        </div>
      )}

      {state === 'ready' && children}

      {state === 'empty' && (
        <div className="py-4 text-center">
          <p className="text-sm text-muted-foreground mb-3">{emptyMessage}</p>
          {emptyAction && (
            <Button
              size="sm"
              variant="outline"
              onClick={emptyAction.onClick}
              disabled={emptyAction.loading}
            >
              {emptyAction.loading ? 'Chargement...' : emptyAction.label}
            </Button>
          )}
        </div>
      )}

      {state === 'error' && (
        <div className="py-4 text-center">
          <div className="flex justify-center mb-2">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <p className="text-sm text-destructive mb-3">{errorMessage}</p>
          {onRetry && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRetry}
              disabled={retrying}
            >
              <RefreshCw className={cn('h-4 w-4 mr-2', retrying && 'animate-spin')} />
              {retrying ? 'Réessai...' : 'Réessayer'}
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
