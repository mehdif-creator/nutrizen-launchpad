import { AppHeader } from '@/components/app/AppHeader';
import { AppFooter } from '@/components/app/AppFooter';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Download, Mail, Clock, Flame, ChefHat } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useWeeklyMenu } from '@/hooks/useWeeklyMenu';
import { Spinner } from '@/components/common/Spinner';
import { useNavigate } from 'react-router-dom';

const weekdays = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

export default function MealPlan() {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { days, isLoading, hasMenu } = useWeeklyMenu(user?.id);

  const handleExportList = () => {
    toast({
      title: '📥 Liste téléchargée',
      description: 'Ta liste de courses est prête.',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <AppHeader />
        <main className="flex-1 container py-8 px-4">
          <div className="flex items-center justify-center py-12">
            <Spinner />
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
            <p className="text-muted-foreground mb-6">
              Tu n'as pas encore de menu pour cette semaine.
            </p>
            <Button onClick={() => navigate('/app')}>
              Retour au tableau de bord
            </Button>
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
        <div className="mb-6 md:mb-8">
          <div className="mb-4">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Tes recettes de la semaine</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              {days.length} recettes personnalisées pour cette semaine
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

        {/* Recipes Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6 md:mb-8">
          {days.map((recipe, index) => (
            <Card 
              key={`${recipe.recipe_id}-${index}`}
              className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
              onClick={() => navigate(`/app/recipes/${recipe.recipe_id}`)}
            >
              <div className="h-48 bg-muted relative overflow-hidden">
                {recipe.image_url ? (
                  <img 
                    src={recipe.image_url} 
                    alt={recipe.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/img/hero-default.png';
                    }}
                  />
                ) : (
                  <img 
                    src="/img/hero-default.png"
                    alt={recipe.title}
                    className="w-full h-full object-cover opacity-50"
                  />
                )}
                <div className="absolute top-2 left-2">
                  <Badge variant="secondary" className="text-xs font-medium">
                    {weekdays[index]}
                  </Badge>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <h3 className="font-semibold text-lg leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                  {recipe.title}
                </h3>
                
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {recipe.prep_min + recipe.total_min} min
                  </span>
                  <span className="flex items-center gap-1">
                    <Flame className="h-3.5 w-3.5" />
                    {Math.round(recipe.calories)} kcal
                  </span>
                </div>

                {/* Macros */}
                {recipe.macros && (
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge variant="outline" className="text-xs">
                      P: {Math.round(recipe.macros.proteins_g)}g
                    </Badge>
                    {recipe.macros.carbs_g && (
                      <Badge variant="outline" className="text-xs">
                        G: {Math.round(recipe.macros.carbs_g)}g
                      </Badge>
                    )}
                    {recipe.macros.fats_g && (
                      <Badge variant="outline" className="text-xs">
                        L: {Math.round(recipe.macros.fats_g)}g
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>

        {/* Shopping List */}
        <Card className="p-4 md:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 md:h-6 md:w-6" />
              Liste de courses
            </h2>
            <Button variant="outline" onClick={handleExportList} className="w-full sm:w-auto">
              <Download className="h-4 w-4 mr-2" />
              Télécharger
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            <div>
              <h3 className="font-semibold mb-3 text-sm md:text-base">🥦 Fruits & Légumes</h3>
              <ul className="space-y-2 text-xs md:text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-primary" />
                  Tomates (4)
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-primary" />
                  Oignons (2)
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-primary" />
                  Carottes (6)
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-3 text-sm md:text-base">🥩 Protéines</h3>
              <ul className="space-y-2 text-xs md:text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-primary" />
                  Poulet (600g)
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-primary" />
                  Œufs (12)
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-3 text-sm md:text-base">🍚 Féculents</h3>
              <ul className="space-y-2 text-xs md:text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-primary" />
                  Riz basmati (500g)
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-primary" />
                  Pâtes (400g)
                </li>
              </ul>
            </div>
          </div>
        </Card>
      </main>

      <AppFooter />
    </div>
  );
}
