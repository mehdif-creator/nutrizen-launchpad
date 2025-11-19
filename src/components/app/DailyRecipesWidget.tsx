import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sun, Moon, ChefHat, Flame, ArrowRight } from 'lucide-react';
import { useDailyRecipes } from '@/hooks/useDailyRecipes';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';

export function DailyRecipesWidget() {
  const { data: recipes, isLoading } = useDailyRecipes();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card className="p-6">
        <Skeleton className="h-8 w-48 mb-4" />
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </Card>
    );
  }

  if (!recipes) {
    return null;
  }

  const RecipeCard = ({ recipe, timeOfDay, icon: Icon }: { recipe: any; timeOfDay: string; icon: any }) => {
    if (!recipe) {
      return (
        <div className="p-4 bg-muted/30 rounded-lg border border-dashed">
          <p className="text-sm text-muted-foreground text-center">
            Aucune recette trouvée pour {timeOfDay}
          </p>
        </div>
      );
    }

    const servings = recipe.servings || recipe.base_servings || 1;
    const caloriesPerServing = recipe.calories_kcal ? Math.round(recipe.calories_kcal / servings) : null;
    const proteinsPerServing = recipe.proteins_g ? Math.round(recipe.proteins_g / servings) : null;
    const carbsPerServing = recipe.carbs_g ? Math.round(recipe.carbs_g / servings) : null;
    const fatsPerServing = recipe.fats_g ? Math.round(recipe.fats_g / servings) : null;

    return (
      <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer group" onClick={() => navigate(`/app/recipes/${recipe.id}`)}>
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon className="h-8 w-8 text-primary" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <p className="text-xs text-muted-foreground mb-1">{timeOfDay}</p>
                <h3 className="font-semibold text-sm md:text-base line-clamp-2 group-hover:text-primary transition-colors">
                  {recipe.title}
                </h3>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
            </div>
            
            {/* Macros compact */}
            {caloriesPerServing && (
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
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
            )}
          </div>
        </div>
      </Card>
    );
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ChefHat className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Tes recettes du jour</h2>
        </div>
      </div>
      
      <div className="space-y-3">
        <RecipeCard recipe={recipes.lunch} timeOfDay="Midi (déjeuner)" icon={Sun} />
        <RecipeCard recipe={recipes.dinner} timeOfDay="Soir (dîner)" icon={Moon} />
      </div>
    </Card>
  );
}
