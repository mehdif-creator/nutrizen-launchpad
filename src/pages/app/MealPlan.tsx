import { AppHeader } from '@/components/app/AppHeader';
import { AppFooter } from '@/components/app/AppFooter';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShoppingCart, Download, Mail, Clock, Flame, ChefHat, Copy, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useWeeklyMenu, getCurrentWeekStart } from '@/hooks/useWeeklyMenu';
import { useFavorites } from '@/hooks/useFavorites';
import { FavoriteButton } from '@/components/app/FavoriteButton';
import { LoadingMessages } from '@/components/common/LoadingMessages';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMemo } from 'react';

const weekdays = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

/**
 * Get week_start string offset by N weeks from current week
 */
function getWeekStartOffset(offset: number): string {
  const base = getCurrentWeekStart();
  const d = new Date(base + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + offset * 7);
  return d.toISOString().split('T')[0];
}

function formatWeekLabel(weekStart: string, offset: number): string {
  if (offset === 0) return 'Cette semaine';
  if (offset === 1) return 'Semaine prochaine';
  if (offset === -1) return 'Semaine dernière';
  const d = new Date(weekStart + 'T00:00:00Z');
  const day = d.getUTCDate();
  const month = d.toLocaleDateString('fr-FR', { month: 'short', timeZone: 'UTC' });
  return `Sem. du ${day} ${month}`;
}

export default function MealPlan() {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const weekOffset = parseInt(searchParams.get('week') || '0');
  
  // Build the 4-week range: current + 3 ahead
  const weekOffsets = [-1, 0, 1, 2, 3];
  
  // The hook fetches for the current calendar week; we show its data when offset=0
  const { days, isLoading, hasMenu } = useWeeklyMenu(user?.id);
  const { isFavorite, toggleFavorite } = useFavorites();

  const setWeekOffset = (offset: number) => {
    if (offset === 0) {
      searchParams.delete('week');
      setSearchParams(searchParams);
    } else {
      setSearchParams({ week: String(offset) });
    }
  };

  const handleExportList = () => {
    toast({ title: '📥 Liste téléchargée', description: 'Votre liste de courses est prête.' });
  };

  // Only show data for current week (offset=0), others show empty state
  const displayDays = weekOffset === 0 ? days : [];
  const displayHasMenu = weekOffset === 0 ? hasMenu : false;

  // Filter favorites from current menu
  const favoriteDays = displayDays.filter(r => r.recipe_id && isFavorite(r.recipe_id));

  if (isLoading && weekOffset === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <AppHeader />
        <main className="flex-1 container py-8 px-4">
          <div className="py-12">
            <LoadingMessages variant="menu" isLoading={true} skeletonCount={4} minDisplayMs={400} />
          </div>
        </main>
        <AppFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />
      <main className="flex-1 container py-4 md:py-8 px-4">
        {/* Week Selector */}
        <div className="mb-6">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setWeekOffset(weekOffset - 1)} disabled={weekOffset <= -4}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {weekOffsets.map((offset) => (
              <Button
                key={offset}
                variant={weekOffset === offset ? 'default' : 'outline'}
                size="sm"
                className="shrink-0 text-xs"
                onClick={() => setWeekOffset(offset)}
              >
                {formatWeekLabel(getWeekStartOffset(offset), offset)}
              </Button>
            ))}
            <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setWeekOffset(weekOffset + 1)} disabled={weekOffset >= 8}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {!displayHasMenu ? (
          <div className="text-center py-12">
            <ChefHat className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">Aucun menu disponible</h2>
            <p className="text-muted-foreground mb-6">
              {weekOffset === 0
                ? "Vous n'avez pas encore de menu pour cette semaine."
                : `Aucun menu généré pour la semaine du ${getWeekStartOffset(weekOffset)}.`}
            </p>
            <Button onClick={() => navigate('/app')}>Retour au tableau de bord</Button>
          </div>
        ) : (
          <>
            <div className="mb-6 md:mb-8">
              <div className="mb-4">
                <h1 className="text-2xl md:text-3xl font-bold mb-2">Vos recettes de la semaine</h1>
                <p className="text-sm md:text-base text-muted-foreground">
                  {displayDays.length} recettes personnalisées
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={handleExportList} className="w-full sm:w-auto">
                  <Download className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Exporter PDF</span>
                  <span className="sm:hidden">PDF</span>
                </Button>
                <Button onClick={handleExportList} className="w-full sm:w-auto">
                  <Mail className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Envoyer par email</span>
                  <span className="sm:hidden">Email</span>
                </Button>
              </div>
            </div>

            {/* Favorites Section */}
            {favoriteDays.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  ❤️ Mes Favoris
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {favoriteDays.map((recipe, idx) => {
                    const dayIndex = displayDays.indexOf(recipe);
                    return (
                      <RecipeCard key={`fav-${recipe.recipe_id}-${idx}`} recipe={recipe} dayIndex={dayIndex} navigate={navigate} isFavorite={true} onToggleFavorite={() => toggleFavorite(recipe.recipe_id)} />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recipes Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6 md:mb-8">
              {displayDays.map((recipe, index) => (
                <RecipeCard key={`${recipe.recipe_id}-${index}`} recipe={recipe} dayIndex={index} navigate={navigate} isFavorite={isFavorite(recipe.recipe_id)} onToggleFavorite={() => toggleFavorite(recipe.recipe_id)} />
              ))}
            </div>

            {/* Shopping List CTA */}
            <Card className="p-4 md:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5 md:h-6 md:w-6" />
                    Liste de courses
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">Générée automatiquement à partir de votre menu</p>
                </div>
                <Button onClick={() => navigate('/app/shopping-list')}>Voir la liste complète</Button>
              </div>
            </Card>
          </>
        )}
      </main>
      <AppFooter />
    </div>
  );
}

function RecipeCard({ recipe, dayIndex, navigate, isFavorite, onToggleFavorite }: any) {
  const dayLabel = dayIndex >= 0 && dayIndex < weekdays.length ? weekdays[dayIndex] : '';
  return (
    <Card
      className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group relative"
      onClick={() => recipe.recipe_id ? navigate(`/app/recipes/${recipe.recipe_id}`) : undefined}
    >
      <div className="h-48 bg-muted relative overflow-hidden">
        {recipe.image_url ? (
          <img src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => { (e.target as HTMLImageElement).src = '/img/hero-default.jpg'; }} />
        ) : (
          <img src="/img/hero-default.jpg" alt={recipe.title} className="w-full h-full object-cover opacity-50" />
        )}
        {dayLabel && (
          <div className="absolute top-2 left-2">
            <Badge variant="secondary" className="text-xs font-medium">{dayLabel}</Badge>
          </div>
        )}
        <div className="absolute top-2 right-2">
          <FavoriteButton isFavorite={isFavorite} onClick={() => onToggleFavorite()} className="bg-background/80 backdrop-blur-sm" />
        </div>
      </div>
      <div className="p-4 space-y-3">
        <h3 className="font-semibold text-lg leading-tight line-clamp-2 group-hover:text-primary transition-colors">{recipe.title}</h3>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{(recipe.prep_min || 0) + (recipe.total_min || 0)} min</span>
          <span className="flex items-center gap-1"><Flame className="h-3.5 w-3.5" />{Math.round(recipe.calories || 0)} kcal</span>
        </div>
        {recipe.macros && (
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="outline" className="text-xs">P: {Math.round(recipe.macros.proteins_g)}g</Badge>
            {recipe.macros.carbs_g && <Badge variant="outline" className="text-xs">G: {Math.round(recipe.macros.carbs_g)}g</Badge>}
            {recipe.macros.fats_g && <Badge variant="outline" className="text-xs">L: {Math.round(recipe.macros.fats_g)}g</Badge>}
          </div>
        )}
      </div>
    </Card>
  );
}
