import { AppHeader } from '@/components/app/AppHeader';
import { AppFooter } from '@/components/app/AppFooter';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Clock, Sparkles, Flame, Users, 
  ShoppingCart, Share2, Copy, Award, Brain, Target
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { StatCard } from '@/components/app/StatCard';
import { Progress } from '@/components/app/Progress';
import { MealCard } from '@/components/app/MealCard';
import { Badge } from '@/components/ui/badge';
import { useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Navigate, useNavigate } from 'react-router-dom';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useWeeklyMenu } from '@/hooks/useWeeklyMenu';

const weekdays = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

export default function Dashboard() {
  const { user, subscription, refreshSubscription, isAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Use custom hooks for data fetching with realtime
  const { stats, isLoading: statsLoading } = useDashboardStats(user?.id);
  const { menu, days, hasMenu, isLoading: menuLoading } = useWeeklyMenu(user?.id);

  const [fridgeInput, setFridgeInput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [showFallbackBanner, setShowFallbackBanner] = useState(false);

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'toi';
  
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
        imageUrl: day.image_url
      }));
    }
    return [];
  }, [days]);

  // KPI calculations (always use 0 as fallback)
  const minutesSaved = stats.temps_gagne;
  const chargeMentalDrop = stats.charge_mentale_pct;
  const streak = stats.serie_en_cours_set_count;
  const credits = stats.credits_zen;
  const refCount = stats.references_count;
  const validated = stats.objectif_hebdos_valide;
  const zenPoints = Math.floor(minutesSaved / 10);
  const zenLevel = zenPoints < 20 ? "Bronze" : zenPoints < 40 ? "Silver" : "Gold";
  const referralUrl = "https://mynutrizen.fr/i/" + (user?.id.slice(0, 8) || "user");
  
  const loading = statsLoading || menuLoading;

  const handleSwap = async (index: number) => {
    // TODO: Implement swap with use-swap edge function
    toast({
      title: "Swap en cours...",
      description: "Fonctionnalité bientôt disponible"
    });
  };

  const handleValidateMeal = async () => {
    // TODO: Implement meal validation
    toast({
      title: "Validation en cours...",
      description: "Fonctionnalité bientôt disponible"
    });
  };

  const handleRegenWeek = async () => {
    if (!user || generating) return;
    
    setGenerating(true);
    setShowFallbackBanner(false);
    
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        throw new Error("No session");
      }

      const { data, error } = await supabase.functions.invoke('generate-menu', {
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
        },
      });

      if (error) throw error;

      if (data.success) {
        setShowFallbackBanner(data.usedFallback || false);
        toast({
          title: "✅ Semaine régénérée !",
          description: data.usedFallback 
            ? "Menu généré avec filtres assouplis (allergies respectées)."
            : "Voici 7 nouveaux repas personnalisés pour toi."
        });
        // Realtime will auto-update the UI
      } else {
        toast({
          title: "⚠️ Génération impossible",
          description: data.message || "Impossible de générer un menu.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error regenerating week:', error);
      toast({
        title: "Erreur",
        description: "Impossible de générer la semaine. Réessaie plus tard.",
        variant: "destructive"
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
        description: "Partage-le pour inviter tes amis."
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de copier le lien.",
        variant: "destructive"
      });
    }
  };

  const handleAddRef = async () => {
    // TODO: Implement referral system
    toast({
      title: "Référence en cours...",
      description: "Fonctionnalité bientôt disponible"
    });
  };

  const handleGenerateFromFridge = () => {
    if (!fridgeInput.trim()) {
      toast({
        title: "Champ vide",
        description: "Entre les ingrédients de ton frigo.",
        variant: "destructive"
      });
      return;
    }
    toast({
      title: "Génération en cours...",
      description: "Fonctionnalité bientôt disponible"
    });
    setFridgeInput("");
    navigate("/app/inspi-frigo");
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/20">
      <AppHeader />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="px-4 sm:px-6 lg:px-10 py-8">
          {showFallbackBanner && (
            <div className="mb-4 p-4 bg-primary/10 border border-primary/20 rounded-xl text-sm">
              ℹ️ Menu généré avec filtres assouplis pour garantir 7 repas. Tes allergies et exclusions sont respectées.
            </div>
          )}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-1">
                Salut, {firstName} ! 👋
              </h1>
              <p className="text-muted-foreground">
                Voici ton tableau de bord NutriZen
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-sm px-3 py-1">
                <Award className="h-3.5 w-3.5 mr-1" />
                {zenLevel} · {zenPoints} pts
              </Badge>
              <Button onClick={handleRegenWeek} size="sm">
                Régénérer la semaine
              </Button>
            </div>
          </div>
        </section>

        {/* KPI Row */}
        <section className="px-4 sm:px-6 lg:px-10 grid md:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          <StatCard 
            label="Temps gagné" 
            value={`+${Math.round(minutesSaved/60)}h`}
            sub={`~${minutesSaved} min cette semaine`}
            icon={<Clock className="h-5 w-5" />}
          />
          <StatCard 
            label="Charge mentale" 
            value={`-${chargeMentalDrop}%`}
            sub="par rapport à la moyenne"
            icon={<Brain className="h-5 w-5" />}
          />
          <StatCard 
            label="Série en cours" 
            value={`${streak} jours`}
            sub="Continue pour +5 crédits"
            icon={<Flame className="h-5 w-5" />}
          />
          <StatCard 
            label="Crédits Zen" 
            value={`${credits}/10`}
            sub={`${10 - credits} swaps utilisés`}
            icon={<Sparkles className="h-5 w-5" />}
          />
          <StatCard 
            label="Références" 
            value={`${refCount}`}
            sub="Amis invités ce mois"
            icon={<Users className="h-5 w-5" />}
          />
          <Card className="rounded-2xl shadow-card border p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-muted-foreground">Objectif hebdo</div>
              <div className="text-xs text-primary">{validated}/5 repas validés</div>
            </div>
            <Progress value={(validated / 5) * 100} />
            <div className="text-xs text-muted-foreground mt-1.5">
              Valide {5 - validated} repas de plus pour le badge{' '}
              <span className="text-foreground font-medium">Parent Zen</span>.
            </div>
          </Card>
        </section>

        {/* Week Planner */}
        <section className="px-4 sm:px-6 lg:px-10 grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
          {/* Left: Meals */}
          <div className="xl:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Semaine en cours</h2>
            </div>
            {loading ? (
              <div className="col-span-full text-center py-12">
                <p className="text-muted-foreground">Chargement...</p>
              </div>
            ) : weekMeals.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <p className="text-muted-foreground mb-4">
                  Aucun menu généré pour cette semaine.
                </p>
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
                  swapsRemaining={credits}
                />
              ))}
              </div>
            )}
          </div>

          {/* Right: Sidebar */}
          <aside className="space-y-6">
            {/* Liste de courses */}
            <Card className="rounded-2xl border shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Liste de courses</h3>
                <Button variant="outline" size="sm">
                  <ShoppingCart className="h-3.5 w-3.5 mr-1" />
                  Exporter
                </Button>
              </div>
              {weekMeals.length > 0 ? (
                <>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {weekMeals.slice(0, 7).map((meal, i) => (
                      <li key={i}>• {meal.title}</li>
                    ))}
                  </ul>
                  <div className="text-xs text-muted-foreground mt-2">
                    Générée depuis ton menu hebdomadaire
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Génère ton menu hebdomadaire pour voir ta liste de courses.
                </p>
              )}
            </Card>

            {/* Partage Social */}
            <Card className="rounded-2xl border shadow-sm bg-primary text-primary-foreground p-5">
              <div className="font-semibold mb-1">Partage ta semaine Zen</div>
              <div className="text-primary-foreground/90 text-sm mb-3">
                Montre tes menus planifiés en 3 minutes — inspire un ami et gagne +5 crédits.
              </div>
              <Button 
                variant="secondary" 
                className="w-full"
                onClick={() => toast({ title: "Partage en développement", description: "Fonctionnalité bientôt disponible." })}
              >
                <Share2 className="h-4 w-4 mr-2" />
                Partager un aperçu
              </Button>
            </Card>

            {/* Invite & gagne */}
            <Card className="rounded-2xl border shadow-sm p-5">
              <div className="font-semibold mb-2">Invite & gagne</div>
              <div className="text-sm text-muted-foreground mb-2">
                Invite 3 amis → 1 mois offert. 5 amis → swaps illimités 30 jours.
              </div>
              <div className="text-xs font-mono bg-muted border rounded-xl p-2 break-all mb-3">
                {referralUrl}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={handleCopyLink}>
                  <Copy className="h-3.5 w-3.5 mr-1" />
                  Copier
                </Button>
                <Button size="sm" className="flex-1" onClick={handleAddRef}>
                  <Users className="h-3.5 w-3.5 mr-1" />
                  J'ai invité 1 ami
                </Button>
              </div>
            </Card>

            {/* Badges */}
            <Card className="rounded-2xl border shadow-sm p-5">
              <div className="font-semibold mb-1">Badges</div>
              <div className="text-sm text-muted-foreground mb-3">
                Gagne des points en validant des repas, en gardant ta série, et en invitant des amis.
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={zenLevel === "Bronze" ? "default" : "outline"}>Bronze</Badge>
                <Badge variant={zenLevel === "Silver" ? "default" : "outline"}>Silver</Badge>
                <Badge variant={zenLevel === "Gold" ? "default" : "outline"}>Gold</Badge>
              </div>
            </Card>
          </aside>
        </section>

        {/* Coach IA */}
        <section className="px-4 sm:px-6 lg:px-10 mb-10">
          <Card className="rounded-2xl border shadow-sm p-5 flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="flex-1">
              <div className="font-semibold mb-1 flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Coach IA — InspiFrigo
              </div>
              <div className="text-sm text-muted-foreground">
                Dis-moi ce qu'il y a dans ton frigo, je te propose un repas en 30 secondes. Gagne +1 crédit si tu le valides.
              </div>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Input 
                placeholder="ex: courgette, thon, yaourt" 
                className="flex-1 md:w-72"
                value={fridgeInput}
                onChange={(e) => setFridgeInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerateFromFridge()}
              />
              <Button onClick={handleGenerateFromFridge}>
                <Sparkles className="h-4 w-4 mr-2" />
                Générer
              </Button>
            </div>
          </Card>
        </section>
      </main>

      <AppFooter />
    </div>
  );
}
