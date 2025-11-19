import { Flame } from 'lucide-react';

interface RecipeMacrosBadgeProps {
  calories?: number;
  proteins?: number;
  carbs?: number;
  fats?: number;
  servings?: number;
  className?: string;
}

export function RecipeMacrosBadge({ 
  calories, 
  proteins, 
  carbs, 
  fats, 
  servings = 1,
  className = ''
}: RecipeMacrosBadgeProps) {
  // Calculate per serving
  const caloriesPerServing = calories ? Math.round(calories / servings) : null;
  const proteinsPerServing = proteins ? Math.round(proteins / servings) : null;
  const carbsPerServing = carbs ? Math.round(carbs / servings) : null;
  const fatsPerServing = fats ? Math.round(fats / servings) : null;

  if (!caloriesPerServing) {
    return null;
  }

  return (
    <div className={`flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground ${className}`}>
      <span className="flex items-center gap-1 font-medium">
        <Flame className="h-3 w-3" />
        {caloriesPerServing} kcal
      </span>
      {proteinsPerServing && (
        <span>• P: {proteinsPerServing}g</span>
      )}
      {carbsPerServing && (
        <span>• G: {carbsPerServing}g</span>
      )}
      {fatsPerServing && (
        <span>• L: {fatsPerServing}g</span>
      )}
    </div>
  );
}
