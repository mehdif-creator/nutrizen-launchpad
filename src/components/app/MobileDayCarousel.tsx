import { useState, useRef, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Flame, Check, Users } from 'lucide-react';
import { RecipeMacrosBadge } from '@/components/app/RecipeMacrosBadge';
import { getRecipeImageUrl, handleImageError } from '@/lib/images';
import { useNavigate } from 'react-router-dom';
import type { DayRecipes, RecipeInfo } from '@/hooks/useWeeklyRecipesByDay';
import { cn } from '@/lib/utils';

interface MobileDayCarouselProps {
  weeklyDays: DayRecipes[];
  onValidate?: (recipeId: string, mealType: 'lunch' | 'dinner') => void;
  onSwap?: (recipeId: string, mealType: 'lunch' | 'dinner', dayIndex: number) => void;
  swapsRemaining: number;
  swapping?: boolean;
  householdAdults: number;
  householdChildren: number;
}

const SHORT_DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

function MobileMealCard({
  recipe,
  mealLabel,
  mealType,
  dayIndex,
  onValidate,
  onSwap,
  swapsRemaining,
  swapping,
}: {
  recipe: RecipeInfo;
  mealLabel: string;
  mealType: 'lunch' | 'dinner';
  dayIndex: number;
  onValidate?: (recipeId: string, mealType: 'lunch' | 'dinner') => void;
  onSwap?: (recipeId: string, mealType: 'lunch' | 'dinner', dayIndex: number) => void;
  swapsRemaining: number;
  swapping?: boolean;
}) {
  const navigate = useNavigate();
  const imageUrl = getRecipeImageUrl({ image_url: recipe.image_url });

  return (
    <Card className="rounded-2xl border shadow-sm overflow-hidden">
      <div className="p-3 pb-1">
        <span className="text-xs font-semibold text-muted-foreground">{mealLabel}</span>
      </div>
      <div className="px-3">
        <div className="w-full h-44 rounded-lg overflow-hidden bg-muted">
          <img
            src={imageUrl}
            alt={recipe.title}
            className="w-full h-full object-cover"
            onError={handleImageError}
          />
        </div>
      </div>
      <div className="p-3 space-y-2">
        <h4 className="font-bold text-[15px] leading-tight line-clamp-2">{recipe.title}</h4>
        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {recipe.prep_min} min
          </span>
          <span className="inline-flex items-center gap-1">
            <Flame className="h-3 w-3" />
            {Math.round(recipe.calories)} kcal
          </span>
          {recipe.proteins_g > 0 && <span>P·{Math.round(recipe.proteins_g)}g</span>}
          {recipe.carbs_g > 0 && <span>G·{Math.round(recipe.carbs_g)}g</span>}
        </div>
        <Button
          className="w-full"
          size="sm"
          onClick={() => onValidate?.(recipe.recipe_id, mealType)}
        >
          <Check className="h-4 w-4 mr-1" />
          Valider
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            disabled={swapsRemaining <= 0 || swapping}
            onClick={() => onSwap?.(recipe.recipe_id, mealType, dayIndex)}
          >
            ↻ Changer
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={() => {
              const pf = recipe.portion_factor && recipe.portion_factor > 0
                ? `?portions=${recipe.portion_factor.toFixed(2)}`
                : '';
              navigate(`/app/recipes/${recipe.recipe_id}${pf}`);
            }}
          >
            Voir la recette
          </Button>
        </div>
      </div>
    </Card>
  );
}

export function MobileDayCarousel({
  weeklyDays,
  onValidate,
  onSwap,
  swapsRemaining,
  swapping,
  householdAdults,
  householdChildren,
}: MobileDayCarouselProps) {
  // Determine today's index
  const todayIndex = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const idx = weeklyDays.findIndex((d) => d.date === today);
    return idx >= 0 ? idx : 0;
  }, [weeklyDays]);

  const [selected, setSelected] = useState(todayIndex);
  const stripRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to today's chip
  useEffect(() => {
    if (stripRef.current) {
      const chip = stripRef.current.children[todayIndex] as HTMLElement | undefined;
      if (chip) {
        chip.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [todayIndex]);

  const selectedDay = weeklyDays[selected];
  if (!selectedDay) return null;

  const today = new Date().toISOString().split('T')[0];
  const effectiveSize = (householdAdults + householdChildren * 0.7).toFixed(1);
  const showHousehold = householdAdults > 1 || householdChildren > 0;

  return (
    <div className="space-y-4 md:hidden">
      {/* Household badge — once above the strip */}
      {showHousehold && (
        <Badge variant="secondary" className="text-xs">
          <Users className="h-3 w-3 mr-1" />
          {householdAdults} adulte{householdAdults > 1 ? 's' : ''}
          {householdChildren > 0 && ` + ${householdChildren} enfant${householdChildren > 1 ? 's' : ''}`}
          <span className="ml-1 opacity-70">(≈ {effectiveSize})</span>
        </Badge>
      )}

      {/* Day chip strip */}
      <div
        ref={stripRef}
        className="flex gap-2 overflow-x-auto pb-1"
        style={{ scrollbarWidth: 'none' }}
      >
        {weeklyDays.map((day, i) => {
          const dateNum = day.date ? new Date(day.date + 'T00:00:00').getDate() : i + 1;
          const isToday = day.date === today;
          const isSelected = i === selected;

          return (
            <button
              key={day.date || i}
              onClick={() => setSelected(i)}
              className={cn(
                'flex flex-col items-center px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-colors relative',
                isSelected
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border bg-muted/50 text-muted-foreground'
              )}
            >
              <span>{SHORT_DAYS[i]}</span>
              <span className="text-[11px]">{dateNum}</span>
              {isToday && !isSelected && (
                <span className="absolute -bottom-0.5 w-1.5 h-1.5 rounded-full bg-primary" />
              )}
              {isToday && isSelected && (
                <span className="absolute -bottom-0.5 w-1.5 h-1.5 rounded-full bg-primary-foreground" />
              )}
            </button>
          );
        })}
      </div>

      {/* Single day view with fade */}
      <div
        key={selected}
        className="space-y-4 animate-in fade-in duration-150"
      >
        {selectedDay.lunch && (
          <MobileMealCard
            recipe={selectedDay.lunch}
            mealLabel="Déjeuner"
            mealType="lunch"
            dayIndex={selectedDay.day_index}
            onValidate={onValidate}
            onSwap={onSwap}
            swapsRemaining={swapsRemaining}
            swapping={swapping}
          />
        )}
        {selectedDay.dinner && (
          <MobileMealCard
            recipe={selectedDay.dinner}
            mealLabel="Dîner"
            mealType="dinner"
            dayIndex={selectedDay.day_index}
            onValidate={onValidate}
            onSwap={onSwap}
            swapsRemaining={swapsRemaining}
            swapping={swapping}
          />
        )}
        {!selectedDay.lunch && !selectedDay.dinner && (
          <p className="text-sm text-muted-foreground text-center py-8">
            Aucun repas planifié pour ce jour.
          </p>
        )}
      </div>
    </div>
  );
}
