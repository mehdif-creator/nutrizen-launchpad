import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Clock, Flame, Check } from 'lucide-react';
import { getRecipeImageUrl, handleImageError } from '@/lib/images';
import type { DayRecipes } from '@/hooks/useWeeklyRecipesByDay';

interface MobileTonightCardProps {
  todayData: DayRecipes | null;
  onValidate?: (recipeId: string, mealType: 'lunch' | 'dinner') => void;
  onSwap?: (recipeId: string, mealType: 'lunch' | 'dinner', dayIndex: number) => void;
  swapsRemaining: number;
}

export function MobileTonightCard({ todayData, onValidate, onSwap, swapsRemaining }: MobileTonightCardProps) {
  if (!todayData) return null;

  const hour = new Date().getHours();
  const isMidi = hour < 14;
  const meal = isMidi ? todayData.lunch : todayData.dinner;
  const mealType: 'lunch' | 'dinner' = isMidi ? 'lunch' : 'dinner';
  const label = isMidi ? 'CE MIDI' : 'CE SOIR';

  if (!meal) return null;

  const imageUrl = getRecipeImageUrl({ image_url: meal.image_url });

  return (
    <Card className="rounded-2xl border shadow-sm overflow-hidden md:hidden">
      <div className="p-3 pb-0">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
          {label}
        </span>
      </div>
      <div className="px-3 pt-2">
        <div className="w-full h-40 rounded-lg overflow-hidden bg-muted">
          <img
            src={imageUrl}
            alt={meal.title}
            className="w-full h-full object-cover"
            onError={handleImageError}
          />
        </div>
      </div>
      <div className="p-3 space-y-2">
        <h3 className="font-bold text-base leading-tight line-clamp-2">{meal.title}</h3>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {meal.prep_min} min
          </span>
          <span>·</span>
          <span className="inline-flex items-center gap-1">
            <Flame className="h-3 w-3" />
            {Math.round(meal.calories)} kcal
          </span>
        </div>
        <Button
          className="w-full"
          size="sm"
          onClick={() => onValidate?.(meal.recipe_id, mealType)}
        >
          <Check className="h-4 w-4 mr-1" />
          Valider
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs"
          disabled={swapsRemaining <= 0}
          onClick={() => onSwap?.(meal.recipe_id, mealType, todayData.day_index)}
        >
          ↻ Changer {swapsRemaining > 0 ? `(${swapsRemaining})` : '(0)'}
        </Button>
      </div>
    </Card>
  );
}
