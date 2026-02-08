import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppHeader } from '@/components/app/AppHeader';
import { AppFooter } from '@/components/app/AppFooter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Sun, Moon, Clock, Flame, Users, ChefHat, RefreshCw, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useEffectivePortions } from '@/hooks/useEffectivePortions';
import { getHouseholdPortionFactor, formatHouseholdDisplay, scaleNutrition, getScaleFactor } from '@/lib/portions';
import { getRecipeImageUrl, handleImageError } from '@/lib/images';
import { RecipeMacrosBadge } from '@/components/app/RecipeMacrosBadge';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface DayRecipe {
  recipe_id: string;
  title: string;
  image_url: string | null;
  image_path?: string | null;
  prep_min: number;
  total_min: number;
  calories: number;
  proteins_g: number;
  carbs_g: number;
  fats_g: number;
  base_servings: number;
}

interface DayMenuData {
  date: string;
  day_name: string;
  lunch: DayRecipe | null;
  dinner: DayRecipe | null;
}

export default function DayMenu() {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: portions } = useEffectivePortions(user?.id);
  
  const [dayData, setDayData] = useState<DayMenuData | null>(null);
  const [loading, setLoading] = useState(true);

  // Calculate household info
  const householdAdults = portions?.servings_breakdown?.adults ?? 1;
  const householdChildren = portions?.servings_breakdown?.children ?? 0;
  const effectivePortions = portions?.effective_servings_per_meal ?? 1;

  useEffect(() => {
    const loadDayMenu = async () => {
      if (!user?.id || !date) return;
      
      try {
        // Call RPC to get day menu data
        const { data, error } = await supabase.rpc('get_day_menu', {
          p_user_id: user.id,
          p_date: date,
        });
        
        if (error) throw error;
        
        if (data) {
          setDayData(data as unknown as DayMenuData);
        }
      } catch (error) {
        console.error('[DayMenu] Error loading:', error);
        toast({
          title: 'Erreur',
          description: 'Impossible de charger le menu du jour.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    loadDayMenu();
  }, [user?.id, date, toast]);

  const formattedDate = date 
    ? format(parseISO(date), "EEEE d MMMM yyyy", { locale: fr })
    : '';

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/20">
        <AppHeader />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-muted-foreground">Chargement du menu...</div>
        </main>
        <AppFooter />
      </div>
    );
  }

  if (!dayData) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/20">
        <AppHeader />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <ChefHat className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">Aucun menu trouvé pour ce jour.</p>
            <Button onClick={() => navigate('/app')}>Retour au tableau de bord</Button>
          </div>
        </main>
        <AppFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/20">
      <AppHeader />
      
      <main className="flex-1 px-4 sm:px-6 lg:px-10 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <Button 
            variant="ghost" 
            onClick={() => navigate('/app')}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au tableau de bord
          </Button>
          
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Menu du jour</h1>
            <p className="text-muted-foreground capitalize">{formattedDate}</p>
            
            {/* Household info */}
            {(householdAdults > 1 || householdChildren > 0) && (
              <div className="mt-3">
                <Badge variant="secondary" className="text-sm">
                  <Users className="h-4 w-4 mr-2" />
                  {formatHouseholdDisplay(householdAdults, householdChildren)}
                </Badge>
              </div>
            )}
          </div>

          {/* Meals Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Lunch */}
            <MealCard
              mealType="lunch"
              recipe={dayData.lunch}
              effectivePortions={effectivePortions}
              onViewRecipe={(id) => navigate(`/app/recipes/${id}`)}
              onGenerateMeal={() => {
                toast({
                  title: 'Bientôt disponible',
                  description: 'La génération de repas individuels arrive bientôt.',
                });
              }}
            />
            
            {/* Dinner */}
            <MealCard
              mealType="dinner"
              recipe={dayData.dinner}
              effectivePortions={effectivePortions}
              onViewRecipe={(id) => navigate(`/app/recipes/${id}`)}
              onGenerateMeal={() => {
                toast({
                  title: 'Bientôt disponible',
                  description: 'La génération de repas individuels arrive bientôt.',
                });
              }}
            />
          </div>
        </div>
      </main>
      
      <AppFooter />
    </div>
  );
}

interface MealCardProps {
  mealType: 'lunch' | 'dinner';
  recipe: DayRecipe | null;
  effectivePortions: number;
  onViewRecipe: (recipeId: string) => void;
  onGenerateMeal: () => void;
}

function MealCard({ mealType, recipe, effectivePortions, onViewRecipe, onGenerateMeal }: MealCardProps) {
  const Icon = mealType === 'lunch' ? Sun : Moon;
  const label = mealType === 'lunch' ? 'Déjeuner' : 'Dîner';
  const iconColor = mealType === 'lunch' ? 'text-orange-500' : 'text-purple-500';
  
  // Empty state
  if (!recipe) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Icon className={`h-5 w-5 ${iconColor}`} />
          <h2 className="text-lg font-semibold">{label}</h2>
        </div>
        
        <div className="text-center py-8 border-2 border-dashed border-muted-foreground/30 rounded-xl">
          <ChefHat className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">
            Aucun repas planifié pour le {label.toLowerCase()}.
          </p>
          <Button variant="outline" onClick={onGenerateMeal}>
            <Plus className="h-4 w-4 mr-2" />
            Générer un repas
          </Button>
        </div>
      </Card>
    );
  }
  
  // Scale nutrition based on effective portions
  const baseServings = recipe.base_servings || 1;
  const scaleFactor = getScaleFactor(effectivePortions, baseServings);
  const scaledNutrition = scaleNutrition({
    calories: recipe.calories,
    proteins: recipe.proteins_g,
    carbs: recipe.carbs_g,
    fats: recipe.fats_g,
  }, scaleFactor);
  
  const imageUrl = getRecipeImageUrl({ 
    image_url: recipe.image_url, 
    image_path: recipe.image_path 
  });
  
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="flex items-center gap-2 p-4 border-b">
        <Icon className={`h-5 w-5 ${iconColor}`} />
        <h2 className="text-lg font-semibold">{label}</h2>
      </div>
      
      {/* Recipe Image */}
      <div className="h-48 bg-muted relative overflow-hidden">
        <img 
          src={imageUrl}
          alt={recipe.title}
          className="w-full h-full object-cover"
          onError={handleImageError}
        />
      </div>
      
      <div className="p-4 space-y-4">
        <h3 className="font-semibold text-lg leading-tight">{recipe.title}</h3>
        
        {/* Quick stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {recipe.prep_min + recipe.total_min} min
          </span>
          <span className="flex items-center gap-1">
            <Flame className="h-4 w-4" />
            {Math.round(scaledNutrition.calories || 0)} kcal
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            {effectivePortions.toFixed(1)} portions
          </span>
        </div>
        
        {/* Macros */}
        <RecipeMacrosBadge
          calories={scaledNutrition.calories || 0}
          proteins={scaledNutrition.proteins}
          carbs={scaledNutrition.carbs}
          fats={scaledNutrition.fats}
          servings={1} // Already scaled
        />
        
        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button 
            className="flex-1"
            onClick={() => onViewRecipe(recipe.recipe_id)}
          >
            Voir la recette
          </Button>
          <Button variant="outline">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
