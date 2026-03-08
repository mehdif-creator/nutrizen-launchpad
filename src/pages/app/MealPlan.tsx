import { AppHeader } from '@/components/app/AppHeader';
import { AppFooter } from '@/components/app/AppFooter';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShoppingCart, Download, Mail, Clock, Flame, ChefHat, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useWeeklyMenu } from '@/hooks/useWeeklyMenu';
import { useFavorites } from '@/hooks/useFavorites';
import { FavoriteButton } from '@/components/app/FavoriteButton';
import { LoadingMessages } from '@/components/common/LoadingMessages';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';

const weekdays = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

function getCurrentWeekNumber(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const oneWeek = 604800000;
  return Math.ceil(diff / oneWeek) % 4 || 4;
}

export default function MealPlan() {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { days, isLoading, hasMenu } = useWeeklyMenu(user?.id);
  const { isFavorite, toggleFavorite } = useFavorites();

  const currentWeek = parseInt(searchParams.get('week') || String(getCurrentWeekNumber()));
  const setWeek = (w: number) => setSearchParams({ week: String(w) });

  const handleExportList = () => {
    toast({ title: '📥 Liste téléchargée', description: 'Votre liste de courses est prête.' });
  };

  const handleCopyWeek = async (targetWeek: number) => {
    if (!user) return;
    try {
      const { data: sourcePlans } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('user_id', user.id)
        .eq('week_number', currentWeek);

      if (!sourcePlans?.length) {
        toast({ title: 'Aucun plan à copier', variant: 'destructive' });
        return;
      }

      for (const plan of sourcePlans) {
        await supabase.from('meal_plans').upsert({
          user_id: user.id,
          week_of: plan.week_of,
          items: plan.items,
          week_number: targetWeek,
        });
      }
      toast({ title: `Plan copié vers Semaine ${targetWeek} ✅` });
    } catch {
      toast({ title: 'Erreur lors de la copie', variant: 'destructive' });
    }
  };

  // Filter favorites from current menu
  const favoriteDays = days.filter(r => r.recipe_id && isFavorite(r.recipe_id));

  if (isLoading) {
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

  if (!hasMenu) {
    return (
      <div className="min-h-screen flex flex-col">
        <AppHeader />
        <main className="flex-1 container py-8 px-4">
          <div className="text-center py-12">
            <ChefHat className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">Aucun menu disponible</h2>
            <p className="text-muted-foreground mb-6">Vous n'avez pas encore de menu pour cette semaine.</p>
            <Button onClick={() => navigate('/app')}>Retour au tableau de bord</Button>
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
        <Tabs value={String(currentWeek)} onValueChange={(v) => setWeek(Number(v))} className="mb-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <TabsList>
              {[1, 2, 3, 4].map((w) => (
                <TabsTrigger key={w} value={String(w)}>Semaine {w}</TabsTrigger>
              ))}
            </TabsList>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Copy className="h-4 w-4" /> Copier vers...
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {[1, 2, 3, 4].filter(w => w !== currentWeek).map(w => (
                  <DropdownMenuItem key={w} onClick={() => handleCopyWeek(w)}>
                    Semaine {w}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </Tabs>

        <div className="mb-6 md:mb-8">
          <div className="mb-4">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Vos recettes de la semaine</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              {days.length} recettes personnalisées — Semaine {currentWeek}
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
              {favoriteDays.map((recipe, index) => (
                <RecipeCard key={`fav-${recipe.recipe_id}-${index}`} recipe={recipe} index={index} navigate={navigate} isFavorite={true} onToggleFavorite={() => toggleFavorite(recipe.recipe_id)} />
              ))}
            </div>
          </div>
        )}

        {/* Recipes Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6 md:mb-8">
          {days.map((recipe, index) => (
            <RecipeCard key={`${recipe.recipe_id}-${index}`} recipe={recipe} index={index} navigate={navigate} isFavorite={isFavorite(recipe.recipe_id)} onToggleFavorite={() => toggleFavorite(recipe.recipe_id)} />
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
      </main>
      <AppFooter />
    </div>
  );
}

function RecipeCard({ recipe, index, navigate, isFavorite, onToggleFavorite }: any) {
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
        <div className="absolute top-2 left-2">
          <Badge variant="secondary" className="text-xs font-medium">{weekdays[index]}</Badge>
        </div>
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
