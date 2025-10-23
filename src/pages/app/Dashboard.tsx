import { AppHeader } from '@/components/app/AppHeader';
import { AppFooter } from '@/components/app/AppFooter';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Clock, Sparkles, Flame, Users, TrendingUp, 
  ShoppingCart, Share2, Copy, Award, Brain, Target
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { StatCard } from '@/components/app/StatCard';
import { Progress } from '@/components/app/Progress';
import { MealCard } from '@/components/app/MealCard';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Navigate, useNavigate } from 'react-router-dom';

// Fake meals catalog for demo
const mealsCatalog = [
  { id: 1, title: "Poulet au curry rapide", time: 15, kcal: 520 },
  { id: 2, title: "Bowl thon & riz vinaigré", time: 10, kcal: 480 },
  { id: 3, title: "Omelette feta & épinards", time: 8, kcal: 390 },
  { id: 4, title: "Salade lentilles & saumon", time: 18, kcal: 540 },
  { id: 5, title: "Pâtes complètes pesto & poulet", time: 12, kcal: 610 },
  { id: 6, title: "Wok express boeuf & brocoli", time: 12, kcal: 560 },
  { id: 7, title: "Tacos healthy haricots noirs", time: 14, kcal: 510 },
];

const weekdays = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

export default function Dashboard() {
  const { user, subscription, refreshSubscription, isAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Real stats from database
  const [stats, setStats] = useState({
    temps_gagne: 0,
    charge_mentale_pct: 0,
    serie_en_cours_set_count: 0,
    credits_zen: 10,
    references_count: 0,
    objectif_hebdos_valide: 0
  });
  const [weeklyMenu, setWeeklyMenu] = useState<any>(null);
  const [fridgeInput, setFridgeInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'toi';
  
  // Redirect admin to admin dashboard
  if (isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  // Build week meals from database or fallback
  const weekMeals = useMemo(() => {
    if (weeklyMenu?.payload?.days && weeklyMenu.payload.days.length > 0) {
      return weeklyMenu.payload.days.map((day: any) => ({
        id: day.recipe_id,
        title: day.title,
        time: day.prep_min,
        kcal: day.calories
      }));
    }
    return [];
  }, [weeklyMenu]);

  // KPI calculations
  const minutesSaved = stats.temps_gagne || 0;
  const chargeMentalDrop = stats.charge_mentale_pct || 0;
  const streak = stats.serie_en_cours_set_count || 0;
  const credits = stats.credits_zen || 10;
  const refCount = stats.references_count || 0;
  const validated = stats.objectif_hebdos_valide || 0;
  const zenPoints = minutesSaved / 10; // Calculate zen points from saved time
  const zenLevel = zenPoints < 20 ? "Bronze" : zenPoints < 40 ? "Silver" : "Gold";
  const referralUrl = "https://mynutrizen.fr/i/" + (user?.id.slice(0, 8) || "user");
  
  // Load user stats and weekly menu
  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      try {
        // Load stats
        const { data: statsData } = await supabase
          .from('user_dashboard_stats')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (statsData) {
          setStats({
            temps_gagne: statsData.temps_gagne || 0,
            charge_mentale_pct: statsData.charge_mentale_pct || 0,
            serie_en_cours_set_count: statsData.serie_en_cours_set_count || 0,
            credits_zen: statsData.credits_zen || 10,
            references_count: statsData.references_count || 0,
            objectif_hebdos_valide: statsData.objectif_hebdos_valide || 0
          });
        }

        // Get current week start
        const now = new Date();
        const dayOfWeek = now.getDay();
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() + diff);
        weekStart.setHours(0, 0, 0, 0);
        const weekStartStr = weekStart.toISOString().split('T')[0];

        // Load weekly menu
        const { data: menuData } = await supabase
          .from('user_weekly_menus')
          .select('*')
          .eq('user_id', user.id)
          .eq('week_start', weekStartStr)
          .maybeSingle();

        setWeeklyMenu(menuData);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
    refreshSubscription();

    // Subscribe to realtime updates for weekly menu
    const channel = supabase
      .channel('user-weekly-menu')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_weekly_menus',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setWeeklyMenu(payload.new);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

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
        toast({
          title: "✅ Semaine régénérée !",
          description: "Voici 7 nouveaux repas personnalisés pour toi."
        });
      } else {
        toast({
          title: "⚠️ Génération partielle",
          description: data.message || "Certains repas n'ont pas pu être générés.",
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
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {weekMeals.map((meal, i) => (
                <MealCard
                  key={i}
                  day={weekdays[i]}
                  title={meal.title}
                  time={meal.time}
                  kcal={meal.kcal}
                  onValidate={handleValidateMeal}
                  onSwap={() => handleSwap(i)}
                  onViewRecipe={() => navigate('/app/meal-plan')}
                  swapsRemaining={credits}
                />
              ))}
            </div>
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
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Blanc de poulet (600 g)</li>
                <li>• Riz complet (500 g)</li>
                <li>• Poivron, oignon, épinards</li>
                <li>• Oeufs (6)</li>
                <li>• Yaourt grec (2)</li>
                <li>• Saumon (2 filets)</li>
                <li>• Haricots noirs (1 boîte)</li>
              </ul>
              <div className="text-xs text-muted-foreground mt-2">
                Triée par rayon · Évite les achats impulsifs
              </div>
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
