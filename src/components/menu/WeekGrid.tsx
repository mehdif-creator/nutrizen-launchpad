import { MealCard } from '@/components/app/MealCard';
import { WeeklyMenuDay } from '@/hooks/useWeeklyMenu';

interface WeekGridProps {
  days: WeeklyMenuDay[];
  onValidate?: (recipeId: string) => void;
  onSwap?: (index: number) => void;
  onViewRecipe?: (recipeId: string) => void;
  swapsRemaining?: number;
}

const WEEKDAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

export function WeekGrid({ 
  days, 
  onValidate, 
  onSwap, 
  onViewRecipe,
  swapsRemaining = 0 
}: WeekGridProps) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {days.map((day, index) => (
        <MealCard
          key={day.recipe_id || index}
          day={WEEKDAYS[index] || day.day}
          title={day.title}
          time={day.prep_min}
          kcal={day.calories}
          imageUrl={day.image_url}
          onValidate={onValidate ? () => onValidate(day.recipe_id) : undefined}
          onSwap={onSwap ? () => onSwap(index) : undefined}
          onViewRecipe={onViewRecipe ? () => onViewRecipe(day.recipe_id) : undefined}
          swapsRemaining={swapsRemaining}
        />
      ))}
    </div>
  );
}

/**
 * Skeleton loader for week grid
 */
export function WeekGridSkeleton() {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(7)].map((_, i) => (
        <div 
          key={i} 
          className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden animate-pulse"
        >
          <div className="h-32 bg-muted" />
          <div className="p-4 space-y-2">
            <div className="h-3 w-16 bg-muted rounded" />
            <div className="h-4 w-full bg-muted rounded" />
            <div className="h-3 w-24 bg-muted rounded" />
            <div className="flex gap-2 pt-2">
              <div className="h-8 flex-1 bg-muted rounded" />
              <div className="h-8 w-20 bg-muted rounded" />
            </div>
            <div className="h-8 w-full bg-muted rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
