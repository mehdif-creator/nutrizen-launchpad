import { DashboardCard, CardState } from './DashboardCard';
import { ShoppingCart, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { DashboardShoppingListStatus } from '@/hooks/useUserDashboard';

interface ShoppingListCardProps {
  status: DashboardShoppingListStatus | null;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

export function ShoppingListCard({
  status,
  isLoading,
  isError,
  onRetry,
}: ShoppingListCardProps) {
  let state: CardState = 'ready';
  if (isLoading) state = 'loading';
  else if (isError) state = 'error';
  else if (!status?.exists) state = 'empty';

  const progress = status && status.items_total > 0 
    ? (status.items_checked / status.items_total) * 100 
    : 0;

  return (
    <DashboardCard
      title="Liste de courses"
      icon={<ShoppingCart className="h-4 w-4" />}
      state={state}
      emptyMessage="Votre liste de courses n'est pas prête."
      emptyAction={{
        label: 'Générer la liste',
        onClick: () => {
          // Navigate to meal plan to generate
          window.location.href = '/app/meal-plan';
        },
      }}
      onRetry={onRetry}
      errorMessage="Impossible de charger votre liste."
    >
      <div className="space-y-3">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progression</span>
            <span className="font-medium">
              {status?.items_checked || 0} / {status?.items_total || 0}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Status message */}
        {progress === 100 && status && status.items_total > 0 && (
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm">
            <Check className="h-4 w-4" />
            Courses terminées !
          </div>
        )}

        {progress > 0 && progress < 100 && (
          <p className="text-xs text-muted-foreground">
            Encore {(status?.items_total || 0) - (status?.items_checked || 0)} articles à cocher.
          </p>
        )}

        {/* Action */}
        <Link to="/app/shopping-list">
          <Button variant="outline" size="sm" className="w-full">
            Voir ma liste
          </Button>
        </Link>
      </div>
    </DashboardCard>
  );
}
