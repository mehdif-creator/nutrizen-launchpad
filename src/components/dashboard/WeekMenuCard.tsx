import { DashboardCard, CardState } from './DashboardCard';
import { Calendar, ChefHat } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import type { DashboardWeek, DashboardTodayMeal } from '@/hooks/useUserDashboard';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface WeekMenuCardProps {
  week: DashboardWeek | null;
  todayMeal: DashboardTodayMeal | null;
  isLoading: boolean;
  isError: boolean;
  onGenerateMenu: () => void;
  generating: boolean;
  onRetry: () => void;
}

export function WeekMenuCard({
  week,
  todayMeal,
  isLoading,
  isError,
  onGenerateMenu,
  generating,
  onRetry,
}: WeekMenuCardProps) {
  let state: CardState = 'ready';
  if (isLoading) state = 'loading';
  else if (isError) state = 'error';
  else if (!week?.menu_exists) state = 'empty';

  const weekStartDate = week?.week_start 
    ? format(parseISO(week.week_start), 'd MMMM', { locale: fr })
    : '';

  return (
    <DashboardCard
      title="Semaine en cours"
      icon={<Calendar className="h-4 w-4" />}
      state={state}
      emptyMessage="Aucun menu généré pour cette semaine."
      emptyAction={{
        label: 'Générer mon menu',
        onClick: onGenerateMenu,
        loading: generating,
      }}
      onRetry={onRetry}
      errorMessage="Impossible de charger votre menu."
    >
      <div className="space-y-3">
        {/* Week info */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Semaine du {weekStartDate}
          </span>
          <span className="text-sm font-medium">
            {week?.meals_count || 0} repas
          </span>
        </div>

        {/* Today's meals */}
        {todayMeal?.exists && (
          <div className="p-3 bg-muted/50 rounded-lg space-y-2">
            <div className="text-xs font-medium text-muted-foreground uppercase">
              Aujourd'hui
            </div>
            {todayMeal.lunch_title && (
              <div className="flex items-center gap-2">
                <ChefHat className="h-4 w-4 text-orange-500" />
                <Link 
                  to={`/app/recipe/${todayMeal.lunch_recipe_id}`}
                  className="text-sm hover:underline truncate"
                >
                  Midi : {todayMeal.lunch_title}
                </Link>
              </div>
            )}
            {todayMeal.dinner_title && (
              <div className="flex items-center gap-2">
                <ChefHat className="h-4 w-4 text-purple-500" />
                <Link 
                  to={`/app/recipe/${todayMeal.dinner_recipe_id}`}
                  className="text-sm hover:underline truncate"
                >
                  Soir : {todayMeal.dinner_title}
                </Link>
              </div>
            )}
          </div>
        )}

        {!todayMeal?.exists && week?.menu_exists && (
          <p className="text-xs text-muted-foreground">
            Aucun repas planifié pour aujourd'hui.
          </p>
        )}

        {/* Action */}
        <div className="flex gap-2">
          <Link to="/app/meal-plan" className="flex-1">
            <Button variant="outline" size="sm" className="w-full">
              Voir ma semaine
            </Button>
          </Link>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onGenerateMenu}
            disabled={generating}
          >
            {generating ? 'Génération...' : 'Régénérer'}
          </Button>
        </div>
      </div>
    </DashboardCard>
  );
}
