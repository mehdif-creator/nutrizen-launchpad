import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Flame, Sun, Moon, Users, Plus, ImageOff } from 'lucide-react';
import { RecipeMacrosBadge } from '@/components/app/RecipeMacrosBadge';
import { useNavigate } from 'react-router-dom';
import { getRecipeImageUrl, handleImageError } from '@/lib/images';

interface Recipe {
  recipe_id: string;
  title: string;
  image_url: string | null;
  image_path?: string | null;
  prep_min: number;
  total_min: number;
  calories: number;
  macros: {
    proteins_g: number;
    carbs_g: number | null;
    fats_g: number | null;
  };
}

interface DayCardWithRecipesProps {
  day: string;
  lunchRecipe?: Recipe | null;
  dinnerRecipe?: Recipe | null;
  onValidate?: (recipeId: string, mealType: 'lunch' | 'dinner') => void;
  onSwap?: (recipeId: string, mealType: 'lunch' | 'dinner') => void;
  onGenerateMeal?: (mealType: 'lunch' | 'dinner') => void;
  swapsRemaining?: number;
  householdAdults?: number;
  householdChildren?: number;
  'data-onboarding-target'?: string;
}

/** Single meal slot display (recipe or placeholder) */
function MealSlot({
  recipe,
  mealType,
  onValidate,
  onSwap,
  onGenerateMeal,
  swapsRemaining,
  navigate,
}: {
  recipe: Recipe | null | undefined;
  mealType: 'lunch' | 'dinner';
  onValidate?: (recipeId: string, mealType: 'lunch' | 'dinner') => void;
  onSwap?: (recipeId: string, mealType: 'lunch' | 'dinner') => void;
  onGenerateMeal?: (mealType: 'lunch' | 'dinner') => void;
  swapsRemaining: number;
  navigate: (path: string) => void;
}) {
  const Icon = mealType === 'lunch' ? Sun : Moon;
  const label = mealType === 'lunch' ? 'Déjeuner' : 'Dîner';

  // Empty state placeholder
  if (!recipe) {
    return (
      <div className="p-3 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <Icon className="h-4 w-4" />
          <span className="font-medium">{label}</span>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          Aucun repas planifié pour le {label.toLowerCase()}.
        </p>
        {onGenerateMeal && (
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={() => onGenerateMeal(mealType)}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Générer / Swap
          </Button>
        )}
      </div>
    );
  }

  // Recipe display
  const imageUrl = getRecipeImageUrl({ image_url: recipe.image_url, image_path: recipe.image_path });

  return (
    <div className="space-y-3 p-3 rounded-lg bg-muted/20 border border-transparent hover:border-muted-foreground/20 transition-colors">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="font-medium">{label}</span>
      </div>

      {/* Mini image */}
      <div className="w-full h-20 rounded-lg overflow-hidden bg-muted">
        <img
          src={imageUrl}
          alt={recipe.title}
          className="w-full h-full object-cover"
          onError={handleImageError}
        />
      </div>

      <h4 className="font-semibold text-sm leading-tight line-clamp-2">{recipe.title}</h4>

      <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {recipe.prep_min + recipe.total_min} min
        </span>
        <span>·</span>
        <span className="inline-flex items-center gap-1">
          <Flame className="h-3 w-3" />
          {Math.round(recipe.calories)} kcal
        </span>
      </div>

      <RecipeMacrosBadge
        calories={recipe.calories}
        proteins={recipe.macros.proteins_g}
        carbs={recipe.macros.carbs_g}
        fats={recipe.macros.fats_g}
        servings={1}
      />

      <div className="flex items-center gap-2 pt-1">
        <Button
          onClick={() => onValidate?.(recipe.recipe_id, mealType)}
          size="sm"
          className="flex-1 text-xs"
        >
          Valider
        </Button>
        <Button
          onClick={() => onSwap?.(recipe.recipe_id, mealType)}
          size="sm"
          variant="outline"
          disabled={swapsRemaining <= 0}
          className="text-xs"
        >
          Swap {swapsRemaining > 0 ? `(${swapsRemaining})` : '(0)'}
        </Button>
      </div>
      <Button
        onClick={() => navigate(`/app/recipes/${recipe.recipe_id}`)}
        size="sm"
        variant="ghost"
        className="w-full text-xs"
      >
        Voir la recette →
      </Button>
    </div>
  );
}

export function DayCardWithRecipes({
  day,
  lunchRecipe,
  dinnerRecipe,
  onValidate,
  onSwap,
  onGenerateMeal,
  swapsRemaining = 0,
  householdAdults = 1,
  householdChildren = 0,
  'data-onboarding-target': dataOnboardingTarget,
}: DayCardWithRecipesProps) {
  const navigate = useNavigate();
  const effectiveSize = (householdAdults + householdChildren * 0.7).toFixed(1);

  // Both meals empty → full placeholder card
  const hasMeals = lunchRecipe || dinnerRecipe;

  return (
    <Card
      className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden hover:shadow-lg transition-all"
      data-onboarding-target={dataOnboardingTarget}
    >
      {/* Header */}
      <div className="p-4 pb-2 flex items-center justify-between border-b border-border">
        <div className="font-semibold">{day}</div>
        {(householdAdults > 1 || householdChildren > 0) && (
          <Badge variant="secondary" className="text-xs">
            <Users className="h-3 w-3 mr-1" />
            {householdAdults > 0 && `${householdAdults} adulte${householdAdults > 1 ? 's' : ''}`}
            {householdAdults > 0 && householdChildren > 0 && ' + '}
            {householdChildren > 0 && `${householdChildren} enfant${householdChildren > 1 ? 's' : ''}`}
            <span className="ml-1 opacity-70">(≈ {effectiveSize})</span>
          </Badge>
        )}
      </div>

      {/* Two meal slots: Lunch + Dinner */}
      <div className="p-4 space-y-4">
        <MealSlot
          recipe={lunchRecipe}
          mealType="lunch"
          onValidate={onValidate}
          onSwap={onSwap}
          onGenerateMeal={onGenerateMeal}
          swapsRemaining={swapsRemaining}
          navigate={navigate}
        />
        <MealSlot
          recipe={dinnerRecipe}
          mealType="dinner"
          onValidate={onValidate}
          onSwap={onSwap}
          onGenerateMeal={onGenerateMeal}
          swapsRemaining={swapsRemaining}
          navigate={navigate}
        />
      </div>
    </Card>
  );
}
