import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppHeader } from '@/components/app/AppHeader';
import { AppFooter } from '@/components/app/AppFooter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Clock, Users, Flame, ChefHat, ArrowLeft, Utensils, BarChart3, RefreshCw, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { storagePublicBaseUrl } from '@/lib/supabaseUrls';
import { RecipeMacrosCard } from '@/components/app/RecipeMacrosCard';
import { SubstitutionsTab } from '@/components/recipe/SubstitutionsTab';
import { scaleIngredientText, formatQuantity } from '@/lib/portions';
import { useAwardXp } from '@/hooks/useAwardXp';
import { useAuth } from '@/contexts/AuthContext';
import { useEffectivePortions } from '@/hooks/useEffectivePortions';
import { useFavorites } from '@/hooks/useFavorites';
import { FavoriteButton } from '@/components/app/FavoriteButton';
import { exportRecipePdf } from '@/lib/recipePdfExport';

interface Recipe {
  id: string;
  title: string;
  image_url?: string;
  image_path?: string;
  prep_time_min?: number;
  cook_time_min?: number;
  total_time_min?: number;
  servings?: number;
  calories_kcal?: number;
  proteins_g?: number;
  carbs_g?: number;
  fats_g?: number;
  difficulty_level?: string;
  cuisine_type?: string;
  meal_type?: string;
  diet_type?: string;
  ingredients?: any;
  instructions?: any;
  allergens?: string[];
  appliances?: string[];
}

export default function RecipeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { awardRecipeView } = useAwardXp();
  const { user } = useAuth();
  const { data: effectivePortions } = useEffectivePortions(user?.id);
  const { isFavorite, toggleFavorite } = useFavorites();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('recipe');

  const portionMultiplier = useMemo(() => {
    if (effectivePortions && recipe) {
      const baseServings = recipe.servings || 1;
      return effectivePortions.effective_servings_per_meal / baseServings;
    }
    return 1;
  }, [effectivePortions, recipe]);

  useEffect(() => {
    const loadRecipe = async () => {
      if (!id) return;
      try {
        const { data, error } = await supabase.from('recipes').select('*').eq('id', id).single();
        if (error) throw error;
        setRecipe(data);
        if (data) awardRecipeView(id);
      } catch (error) {
        console.error('Error loading recipe:', error);
        toast({ title: "Erreur", description: "Impossible de charger la recette.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    loadRecipe();
  }, [id, toast, awardRecipeView]);

  const handleExportPdf = () => {
    if (!recipe) return;
    exportRecipePdf({
      title: recipe.title,
      difficulty_level: recipe.difficulty_level,
      cuisine_type: recipe.cuisine_type,
      meal_type: recipe.meal_type,
      diet_type: recipe.diet_type,
      prep_time_min: recipe.prep_time_min,
      total_time_min: recipe.total_time_min,
      servings: recipe.servings,
      calories_kcal: recipe.calories_kcal,
      proteins_g: recipe.proteins_g,
      carbs_g: recipe.carbs_g,
      fats_g: recipe.fats_g,
      ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
      instructions: Array.isArray(recipe.instructions) ? recipe.instructions : [],
    });
    toast({ title: '📥 PDF exporté', description: 'Votre recette a été téléchargée.' });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <AppHeader />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-muted-foreground">Chargement...</div>
        </main>
        <AppFooter />
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <AppHeader />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">Recette introuvable</p>
            <Button onClick={() => navigate('/app')}>Retour au dashboard</Button>
          </div>
        </main>
        <AppFooter />
      </div>
    );
  }

  const imageUrl = recipe.image_url || (recipe.image_path ? `${storagePublicBaseUrl()}/${recipe.image_path}` : null);
  const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
  const instructions = Array.isArray(recipe.instructions) ? recipe.instructions : [];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/20">
      <AppHeader />
      <main className="flex-1 px-4 sm:px-6 lg:px-10 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <Button variant="ghost" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Retour
            </Button>
            <div className="flex items-center gap-2">
              <FavoriteButton isFavorite={isFavorite(recipe.id)} onClick={() => toggleFavorite(recipe.id)} size="default" />
              <Button variant="outline" onClick={handleExportPdf} className="gap-2">
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Exporter en PDF</span>
                <span className="sm:hidden">PDF</span>
              </Button>
            </div>
          </div>

          {/* Hero Image */}
          {imageUrl && (
            <div className="w-full rounded-2xl overflow-hidden mb-6 bg-muted">
              <img src={imageUrl} alt={recipe.title} className="w-full h-auto max-h-[500px] object-contain"
                onError={(e) => { (e.target as HTMLImageElement).src = '/img/hero-default.jpg'; }} />
            </div>
          )}

          {/* Recipe Header */}
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold mb-4">{recipe.title}</h1>
            <div className="flex flex-wrap gap-2 mb-6">
              {recipe.difficulty_level && (
                <Badge variant="outline"><ChefHat className="h-3 w-3 mr-1" />
                  {recipe.difficulty_level === 'beginner' ? 'Débutant' : recipe.difficulty_level === 'intermediate' ? 'Intermédiaire' : 'Expert'}
                </Badge>
              )}
              {recipe.cuisine_type && <Badge variant="outline">{recipe.cuisine_type}</Badge>}
              {recipe.meal_type && <Badge variant="outline">{recipe.meal_type}</Badge>}
              {recipe.diet_type && <Badge variant="outline">{recipe.diet_type}</Badge>}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {recipe.prep_time_min && (
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-1"><Clock className="h-4 w-4 text-primary" /><span className="text-sm text-muted-foreground">Préparation</span></div>
                  <div className="text-lg font-semibold">{recipe.prep_time_min} min</div>
                </Card>
              )}
              {recipe.total_time_min && (
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-1"><Clock className="h-4 w-4 text-primary" /><span className="text-sm text-muted-foreground">Total</span></div>
                  <div className="text-lg font-semibold">{recipe.total_time_min} min</div>
                </Card>
              )}
              {recipe.servings && (
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-1"><Users className="h-4 w-4 text-primary" /><span className="text-sm text-muted-foreground">Portions</span></div>
                  <div className="text-lg font-semibold">
                    {portionMultiplier !== 1 ? `${(recipe.servings * portionMultiplier).toFixed(1)}` : recipe.servings}
                  </div>
                  {portionMultiplier !== 1 && <div className="text-xs text-muted-foreground mt-1">Base : {recipe.servings} pers. × {portionMultiplier.toFixed(1)}</div>}
                </Card>
              )}
              {recipe.calories_kcal && (
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-1"><Flame className="h-4 w-4 text-primary" /><span className="text-sm text-muted-foreground">Calories</span></div>
                  <div className="text-lg font-semibold">{Math.round((recipe.calories_kcal || 0) * portionMultiplier)} kcal</div>
                  {portionMultiplier !== 1 && <div className="text-xs text-muted-foreground">{recipe.calories_kcal} kcal/pers.</div>}
                </Card>
              )}
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="recipe" className="gap-1"><Utensils className="h-4 w-4" /><span className="hidden sm:inline">Recette</span></TabsTrigger>
              <TabsTrigger value="macros" className="gap-1"><BarChart3 className="h-4 w-4" /><span className="hidden sm:inline">Macros</span></TabsTrigger>
              <TabsTrigger value="substitutions" className="gap-1"><RefreshCw className="h-4 w-4" /><span className="hidden sm:inline">Substitutions</span></TabsTrigger>
            </TabsList>

            <TabsContent value="recipe" className="mt-6">
              <div className="grid md:grid-cols-2 gap-8">
                {ingredients.length > 0 && (
                  <Card className="p-6">
                    <h2 className="text-xl font-semibold mb-4">Ingrédients</h2>
                    <ul className="space-y-2">
                      {ingredients.map((ingredient: any, index: number) => {
                        let display: string;
                        if (typeof ingredient === 'string') {
                          display = scaleIngredientText(ingredient, portionMultiplier);
                        } else {
                          const name = ingredient.name || ingredient.ingredient || '';
                          const qty = ingredient.quantity ?? ingredient.amount ?? null;
                          const unit = ingredient.unit || '';
                          if (qty !== null) {
                            const scaled = qty * portionMultiplier;
                            display = `${formatQuantity(scaled)}${unit ? ' ' + unit : ''} ${name}`.trim();
                          } else {
                            display = name;
                          }
                        }
                        return (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-primary mt-1">•</span>
                            <span>{display}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </Card>
                )}
                {instructions.length > 0 && (
                  <Card className="p-6">
                    <h2 className="text-xl font-semibold mb-4">Instructions</h2>
                    <ol className="space-y-3">
                      {instructions.map((instruction: any, index: number) => (
                        <li key={index} className="flex gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">{index + 1}</span>
                          <span className="flex-1">{typeof instruction === 'string' ? instruction : instruction.step || instruction.instruction}</span>
                        </li>
                      ))}
                    </ol>
                  </Card>
                )}
              </div>

              {(recipe.allergens?.length || recipe.appliances?.length) ? (
                <Card className="p-6 mt-8">
                  {recipe.allergens && recipe.allergens.length > 0 && (
                    <div className="mb-4">
                      <h3 className="font-semibold mb-2">Allergènes</h3>
                      <div className="flex flex-wrap gap-2">
                        {recipe.allergens.map((allergen, index) => (
                          <Badge key={index} variant="destructive">{allergen}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {recipe.appliances && recipe.appliances.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2">Équipement nécessaire</h3>
                      <div className="flex flex-wrap gap-2">
                        {recipe.appliances.map((appliance, index) => (
                          <Badge key={index} variant="secondary">{appliance}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              ) : null}
            </TabsContent>

            <TabsContent value="macros" className="mt-6">
              <RecipeMacrosCard
                calories={recipe.calories_kcal}
                proteins={recipe.proteins_g}
                carbs={recipe.carbs_g}
                fats={recipe.fats_g}
                servings={effectivePortions?.effective_servings_per_meal ?? (recipe.servings || 1)}
                isPartial={false}
              />
            </TabsContent>

            <TabsContent value="substitutions" className="mt-6">
              <Card className="p-6">
                <SubstitutionsTab recipeId={recipe.id} ingredients={ingredients} />
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}
