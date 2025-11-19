import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Flame, ChevronDown, ChevronUp, Sun, Moon, Users } from 'lucide-react';
import { RecipeMacrosBadge } from '@/components/app/RecipeMacrosBadge';
import { useNavigate } from 'react-router-dom';

interface Recipe {
  recipe_id: string;
  title: string;
  image_url: string | null;
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
  swapsRemaining?: number;
  householdAdults?: number;
  householdChildren?: number;
  'data-onboarding-target'?: string;
}

export function DayCardWithRecipes({
  day,
  lunchRecipe,
  dinnerRecipe,
  onValidate,
  onSwap,
  swapsRemaining = 0,
  householdAdults = 1,
  householdChildren = 0,
  'data-onboarding-target': dataOnboardingTarget
}: DayCardWithRecipesProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();
  const effectiveSize = (householdAdults + householdChildren * 0.7).toFixed(1);

  // Display the primary recipe (lunch if available, otherwise dinner)
  const primaryRecipe = lunchRecipe || dinnerRecipe;
  const hasMultipleRecipes = lunchRecipe && dinnerRecipe;

  if (!primaryRecipe) {
    return (
      <Card className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden p-4">
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">Aucune recette planifiée pour {day}</p>
        </div>
      </Card>
    );
  }

  const RecipeRow = ({ recipe, mealType, icon: Icon }: { recipe: Recipe; mealType: 'lunch' | 'dinner'; icon: any }) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="font-medium">{mealType === 'lunch' ? 'Déjeuner' : 'Dîner'}</span>
      </div>
      
      <h3 className="font-semibold leading-tight line-clamp-2">{recipe.title}</h3>
      
      <div className="text-xs text-muted-foreground flex items-center gap-3">
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {recipe.prep_min + recipe.total_min} min
        </span>
        <span>·</span>
        <span className="inline-flex items-center gap-1">
          <Flame className="h-3.5 w-3.5" />
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

      <div className="flex items-center gap-2 pt-2">
        <Button 
          onClick={() => onValidate?.(recipe.recipe_id, mealType)}
          size="sm" 
          className="flex-1"
        >
          Valider
        </Button>
        <Button 
          onClick={() => onSwap?.(recipe.recipe_id, mealType)}
          size="sm" 
          variant="outline"
          disabled={swapsRemaining <= 0}
        >
          Swap {swapsRemaining > 0 ? `(${swapsRemaining})` : "(0)"}
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

  return (
    <Card 
      className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden group hover:shadow-lg transition-all"
      data-onboarding-target={dataOnboardingTarget}
    >
      {/* Recipe Image */}
      <div 
        className="h-32 bg-muted relative overflow-hidden cursor-pointer"
        onClick={() => hasMultipleRecipes && setIsExpanded(!isExpanded)}
      >
        {primaryRecipe.image_url ? (
          <img 
            src={primaryRecipe.image_url} 
            alt={primaryRecipe.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/img/hero-default.png';
            }}
          />
        ) : (
          <img 
            src="/img/hero-default.png"
            alt={primaryRecipe.title}
            className="w-full h-full object-cover opacity-50"
          />
        )}
        {hasMultipleRecipes && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Badge variant="secondary" className="text-xs font-medium">
              2 recettes disponibles
            </Badge>
          </div>
        )}
      </div>

      {/* Recipe Content */}
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground font-medium">{day}</div>
          {hasMultipleRecipes && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>

        {/* Household portions badge */}
        {(householdAdults > 1 || householdChildren > 0) && (
          <Badge variant="secondary" className="text-xs">
            <Users className="h-3 w-3 mr-1" />
            {householdAdults > 0 && `${householdAdults} adulte${householdAdults > 1 ? 's' : ''}`}
            {householdAdults > 0 && householdChildren > 0 && ' + '}
            {householdChildren > 0 && `${householdChildren} enfant${householdChildren > 1 ? 's' : ''}`}
            <span className="ml-1 opacity-70">(≈ {effectiveSize})</span>
          </Badge>
        )}

        {/* Show collapsed or expanded view */}
        {!isExpanded ? (
          <RecipeRow recipe={primaryRecipe} mealType={lunchRecipe ? 'lunch' : 'dinner'} icon={lunchRecipe ? Sun : Moon} />
        ) : (
          <div className="space-y-6">
            {lunchRecipe && (
              <>
                <RecipeRow recipe={lunchRecipe} mealType="lunch" icon={Sun} />
                <div className="border-t my-4" />
              </>
            )}
            {dinnerRecipe && (
              <RecipeRow recipe={dinnerRecipe} mealType="dinner" icon={Moon} />
            )}
          </div>
        )}
      </div>
    </Card>
  );
}