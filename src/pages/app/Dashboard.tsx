import { AppHeader } from "@/components/app/AppHeader";
import { AppFooter } from "@/components/app/AppFooter";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Sparkles, Flame, Users, ShoppingCart, Share2, Copy, Brain, Trophy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { StatCard } from "@/components/app/StatCard";
import { Progress } from "@/components/app/Progress";
import { MealCard } from "@/components/app/MealCard";
import { Badge } from "@/components/ui/badge";
import { StreakBar } from "@/components/app/StreakBar";
import { ZenCreditsDisplay } from "@/components/app/ZenCreditsDisplay";
import { InsufficientCreditsModal } from "@/components/app/InsufficientCreditsModal";
import { BuyCreditsSection } from "@/components/app/BuyCreditsSection";
import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navigate, useNavigate, Link } from "react-router-dom";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useWeeklyMenu } from "@/hooks/useWeeklyMenu";
import { OnboardingCoach } from "@/components/app/OnboardingCoach";
import { DailyRecipesWidget } from "@/components/app/DailyRecipesWidget";

const weekdays = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

export default function Dashboard() {
  const { user, subscription, refreshSubscription, isAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Use custom hooks for data fetching with realtime
  const { stats, isLoading: statsLoading } = useDashboardStats(user?.id);
  const { 
    menu, 
    days, 
    hasMenu, 
    isLoading: menuLoading,
    householdAdults,
    householdChildren 
  } = useWeeklyMenu(user?.id);

  const [generating, setGenerating] = useState(false);
  const [creditsModalOpen, setCreditsModalOpen] = useState(false);
  const [creditsError, setCreditsError] = useState<{
    currentBalance: number;
    required: number;
    feature: string;
  } | null>(null);

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "toi";

  useEffect(() => {
    // Check for successful credit purchase
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('credits_purchased') === 'true') {
      toast({
        title: "Bravo 🎉",
        description: "Tu viens d'ajouter 15 Crédits Zen non expirants à ton compte !",
      });
      window.history.replaceState({}, '', '/app/dashboard');
    }

    // Scroll to credits section if requested
    if (urlParams.get('scroll_to') === 'credits') {
      setTimeout(() => {
        document.getElementById('credits')?.scrollIntoView({ behavior: 'smooth' });
      }, 500);
      window.history.replaceState({}, '', '/app/dashboard');
    }
  }, [toast]);

  // Redirect admin to admin dashboard
  if (isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  // Build week meals from database
  const weekMeals = useMemo(() => {
    if (days && days.length > 0) {
      return days.map((day: any) => ({
        id: day.recipe_id,
        title: day.title,
        time: day.prep_min || 0,
        kcal: day.calories || 0,
        proteins: day.proteins_g,
        carbs: day.carbs_g,
        fats: day.fats_g,
        servings: day.servings || 1,
        imageUrl: day.image_url,
      }));
    }
    return [];
  }, [days]);

  // Fetch ingredients for shopping list
  const [shoppingList, setShoppingList] = useState<string[]>([]);

  useEffect(() => {
    const fetchIngredients = async () => {
      if (!weekMeals.length) {
        setShoppingList([]);
        return;
      }

      const recipeIds = weekMeals.map((meal) => meal.id);
      const { data, error } = await supabase.from("recipes").select("ingredients").in("id", recipeIds);

      if (error) {
        console.error("Error fetching ingredients:", error);
        return;
      }

      const allIngredients: string[] = [];
      const ingredientSet = new Set<string>();

      data?.forEach((recipe) => {
        if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
          recipe.ingredients.forEach((ing: any) => {
            let ingredientName = "";

            if (typeof ing === "string") {
              ingredientName = ing;
            } else if (ing.name) {
              ingredientName = ing.name;
            } else if (ing.ingredient) {
              ingredientName = ing.ingredient;
            }

            // Clean ingredient name: remove quantities and measurements
            if (ingredientName) {
              // Remove common quantity patterns (numbers, units, etc.)
              ingredientName = ingredientName
                .replace(
                  /^\d+(\.\d+)?\s*(g|kg|ml|cl|l|cuillère|c\.|càc|càs|pincée|brin|feuilles?|tranches?|morceaux?|gouttes?|sachet|boîte|paquet|tasse|verre)\s+(de|d'|à)\s*/gi,
                  "",
                )
                .replace(
                  /^\d+(\.\d+)?\s*(g|kg|ml|cl|l|cuillère|c\.|càc|càs|pincée|brin|feuilles?|tranches?|morceaux?|gouttes?|sachet|boîte|paquet|tasse|verre)\s+/gi,
                  "",
                )
                .replace(/^\d+\s+/g, "")
                .trim();

              if (ingredientName && !ingredientSet.has(ingredientName.toLowerCase())) {
                ingredientSet.add(ingredientName.toLowerCase());
                allIngredients.push(ingredientName);
              }
            }
          });
        }
      });

      setShoppingList(allIngredients);
    };

    fetchIngredients();
  }, [weekMeals]);

  // KPI calculations (always use 0 as fallback)
  const minutesSaved = stats.temps_gagne;
  const chargeMentalDrop = stats.charge_mentale_pct;
  const streak = stats.serie_en_cours_set_count;
  const refCount = stats.references_count;
  const validated = stats.objectif_hebdos_valide;
  const referralUrl = "https://mynutrizen.fr/i/" + (user?.id.slice(0, 8) || "user");

  const loading = statsLoading || menuLoading;

  const handleSwap = async (index: number) => {
    if (!user || !menu) return;

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        throw new Error("No session");
      }

      const { data, error } = await supabase.functions.invoke("use-swap", {
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
        },
        body: {
          meal_plan_id: menu.menu_id,
          day: index,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Recette changée !",
          description: `Il te reste ${data.creditsRemaining} Crédits Zen.`,
        });
        // Realtime will auto-update
      } else if (data.error_code === 'INSUFFICIENT_CREDITS') {
        // Show credits modal
        setCreditsError({
          currentBalance: data.current_balance || 0,
          required: data.required || 1,
          feature: 'swap',
        });
        setCreditsModalOpen(true);
      } else {
        toast({
          title: "Erreur",
          description: data.error || "Impossible de changer la recette.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error swapping:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors du swap.",
        variant: "destructive",
      });
    }
  };

  const handleValidateMeal = async () => {
    // TODO: Implement meal validation
    toast({
      title: "Validation en cours...",
      description: "Fonctionnalité bientôt disponible",
    });
  };

  const handleRegenWeek = async () => {
    if (!user || generating) return;

    setGenerating(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        throw new Error("No session");
      }

      const { data, error } = await supabase.functions.invoke("generate-menu", {
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Menus générés avec succès",
        });
        // Realtime will auto-update the UI
      } else {
        toast({
          title: "Génération impossible",
          description: data?.message || "Impossible de générer un menu.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error regenerating week:", error);
      toast({
        title: "Erreur",
        description: "Impossible de générer la semaine. Réessaie plus tard.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralUrl);
      toast({
        title: "Lien copié !",
        description: "Partage-le pour inviter tes amis.",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de copier le lien.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/20">
      <AppHeader />
      
      {/* Onboarding Coach */}
      <OnboardingCoach userId={user?.id} />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="px-4 sm:px-6 lg:px-10 py-4 md:py-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 md:mb-6">
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-1">Salut, {firstName} ! 👋</h1>
              <p className="text-sm md:text-base text-muted-foreground">Voici ton tableau de bord NutriZen</p>
            </div>
          <div className="flex flex-wrap items-center gap-2" data-onboarding-target="generate-menu">
              <Button onClick={handleRegenWeek} size="sm" disabled={generating}>
                {generating ? "Génération..." : "Régénérer la semaine (7 crédits)"}
              </Button>
            </div>
          </div>

          {/* Streak Bar */}
          <StreakBar />
        </section>

        {/* Quick Links */}
        <section className="px-4 sm:px-6 lg:px-10 mb-6 md:mb-8">
          <h3 className="text-base md:text-lg font-semibold mb-3">Accès rapide</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link
              to="/app/gamification"
              className="group relative overflow-hidden rounded-xl border bg-gradient-to-br from-primary/5 to-primary/10 p-4 transition-all duration-300 hover:shadow-lg hover:scale-105 hover:border-primary/50"
            >
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 rounded-lg p-2.5 group-hover:bg-primary/20 transition-colors">
                  <Trophy className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="font-medium text-sm">Gamification</div>
                  <div className="text-xs text-muted-foreground">Points & badges</div>
                </div>
              </div>
              <div className="absolute -right-4 -bottom-4 opacity-10">
                <Trophy className="h-20 w-20 text-primary" />
              </div>
            </Link>

            <Link
              to="/app/referral"
              className="group relative overflow-hidden rounded-xl border bg-gradient-to-br from-green-500/5 to-green-500/10 p-4 transition-all duration-300 hover:shadow-lg hover:scale-105 hover:border-green-500/50"
            >
              <div className="flex items-center gap-3">
                <div className="bg-green-500/10 rounded-lg p-2.5 group-hover:bg-green-500/20 transition-colors">
                  <Users className="h-5 w-5 text-green-600 dark:text-green-500" />
                </div>
                <div>
                  <div className="font-medium text-sm">Parrainage</div>
                  <div className="text-xs text-muted-foreground">Invite tes amis</div>
                </div>
              </div>
              <div className="absolute -right-4 -bottom-4 opacity-10">
                <Users className="h-20 w-20 text-green-600 dark:text-green-500" />
              </div>
            </Link>

            <Link
              to="/app/menu-history"
              className="group relative overflow-hidden rounded-xl border bg-gradient-to-br from-orange-500/5 to-orange-500/10 p-4 transition-all duration-300 hover:shadow-lg hover:scale-105 hover:border-orange-500/50"
            >
              <div className="flex items-center gap-3">
                <div className="bg-orange-500/10 rounded-lg p-2.5 group-hover:bg-orange-500/20 transition-colors">
                  <Clock className="h-5 w-5 text-orange-600 dark:text-orange-500" />
                </div>
                <div>
                  <div className="font-medium text-sm">Historique</div>
                  <div className="text-xs text-muted-foreground">Menus passés</div>
                </div>
              </div>
              <div className="absolute -right-4 -bottom-4 opacity-10">
                <Clock className="h-20 w-20 text-orange-600 dark:text-orange-500" />
              </div>
            </Link>
          </div>
        </section>

        {/* KPI Row */}
        <section className="px-4 sm:px-6 lg:px-10 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4 mb-6 md:mb-8">
          <StatCard
            label="Temps gagné"
            value={`+${Math.round(minutesSaved / 60)}h`}
            sub={`~${minutesSaved} min`}
            icon={<Clock className="h-4 w-4 md:h-5 md:w-5" />}
          />
          <StatCard
            label="Charge mentale"
            value={`-${chargeMentalDrop}%`}
            sub="vs moyenne"
            icon={<Brain className="h-4 w-4 md:h-5 md:w-5" />}
          />
          <StatCard
            label="Série"
            value={`${streak}j`}
            sub="+5 crédits"
            icon={<Flame className="h-4 w-4 md:h-5 md:w-5" />}
          />
          <StatCard
            label="Crédits"
            value={`${stats.credits_zen}`}
            sub={`${10 - stats.credits_zen} utilisés`}
            icon={<Sparkles className="h-4 w-4 md:h-5 md:w-5" />}
          />
          <StatCard
            label="Références"
            value={`${refCount}`}
            sub="Amis invités"
            icon={<Users className="h-4 w-4 md:h-5 md:w-5" />}
          />
          <Card className="rounded-2xl shadow-card border p-3 md:p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs md:text-sm text-muted-foreground">Objectif</div>
              <div className="text-xs text-primary">{validated}/5</div>
            </div>
            <Progress value={(validated / 5) * 100} className="h-1.5 md:h-2" />
            <div className="text-xs text-muted-foreground mt-1.5 hidden sm:block">
              Valide {5 - validated} repas de plus
            </div>
          </Card>
        </section>

        {/* Week Planner */}
        <section className="px-4 sm:px-6 lg:px-10 grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8 mb-6 md:mb-8">
          {/* Left: Meals + Quick Links */}
          <div className="xl:col-span-2 space-y-6">
            {/* Daily Recipes Widget */}
            <DailyRecipesWidget />
            
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg md:text-xl font-bold">Semaine en cours</h2>
            </div>
            {loading ? (
              <div className="col-span-full text-center py-12">
                <p className="text-muted-foreground">Chargement...</p>
              </div>
            ) : weekMeals.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <p className="text-muted-foreground mb-4">Aucun menu généré pour cette semaine.</p>
                <Button onClick={handleRegenWeek} disabled={generating}>
                  {generating ? "Génération..." : "Générer ma semaine"}
                </Button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {weekMeals.map((meal, i) => (
                <MealCard
                    key={`${meal.id}-${i}`}
                    day={weekdays[i]}
                    title={meal.title}
                    time={meal.time}
                    kcal={meal.kcal}
                    imageUrl={meal.imageUrl}
                    onValidate={handleValidateMeal}
                    onSwap={() => handleSwap(i)}
                    onViewRecipe={() => navigate(`/app/recipes/${meal.id}`)}
                    swapsRemaining={stats.credits_zen}
                    householdAdults={householdAdults}
                    householdChildren={householdChildren}
                    proteins={meal.proteins}
                    carbs={meal.carbs}
                    fats={meal.fats}
                    servings={meal.servings || 1}
                    data-onboarding-target={i === 0 ? "meal-card" : undefined}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right: Sidebar */}
          <aside className="space-y-4 md:space-y-6">
            {/* Credits Display & Purchase */}
            <div className="space-y-4" id="credits">
              <ZenCreditsDisplay userId={user?.id} showBuyButton={false} size="md" />
              <BuyCreditsSection />
            </div>

            {/* Liste de courses */}
            <Card className="rounded-2xl border shadow-sm p-4 md:p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm md:text-base font-semibold">Liste de courses ( en développement )</h3>
                <Button variant="outline" size="sm" className="text-xs">
                  <ShoppingCart className="h-3.5 w-3.5 mr-1" />
                  <span className="hidden sm:inline">Exporter</span>
                </Button>
              </div>
              {shoppingList.length > 0 ? (
                <>
                  <ul className="text-xs md:text-sm text-muted-foreground space-y-1 max-h-48 md:max-h-64 overflow-y-auto">
                    {shoppingList.map((ingredient, i) => (
                      <li key={i}>• {ingredient}</li>
                    ))}
                  </ul>
                  <div className="text-xs text-muted-foreground mt-2">Générée depuis ton menu hebdomadaire</div>
                </>
              ) : (
                <p className="text-xs md:text-sm text-muted-foreground">
                  Génère ton menu hebdomadaire pour voir ta liste de courses.
                </p>
              )}
            </Card>

            {/* Partage Social */}
            <Card className="rounded-2xl border shadow-sm bg-primary text-primary-foreground p-4 md:p-5">
              <div className="text-sm md:text-base font-semibold mb-1">Partage ta semaine Zen</div>
              <div className="text-primary-foreground/90 text-xs md:text-sm mb-3">
                Montre tes menus planifiés en 3 minutes — inspire un ami et gagne +5 crédits.
              </div>
              <Button
                variant="secondary"
                className="w-full text-xs md:text-sm"
                onClick={() =>
                  toast({ title: "Partage en développement", description: "Fonctionnalité bientôt disponible." })
                }
              >
                <Share2 className="h-4 w-4 mr-2" />
                Partager un aperçu
              </Button>
            </Card>

            {/* Invite & gagne */}
            <Card className="rounded-2xl border shadow-sm p-4 md:p-5">
              <div className="text-sm md:text-base font-semibold mb-2">Invite & gagne</div>
              <div className="text-xs md:text-sm text-muted-foreground mb-2">
                Invite 5 amis → 1 mois offert. Et des avantages exclusifs au-delà.
              </div>
              <div className="text-xs font-mono bg-muted border rounded-xl p-2 break-all mb-3">{referralUrl}</div>
              <Button variant="outline" size="sm" className="w-full text-xs md:text-sm" onClick={handleCopyLink}>
                <Copy className="h-3.5 w-3.5 mr-1" />
                Copier le lien
              </Button>
            </Card>

          </aside>
        </section>
      </main>

      <AppFooter />
    </div>
  );
}
