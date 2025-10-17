import { AppHeader } from '@/components/app/AppHeader';
import { AppFooter } from '@/components/app/AppFooter';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, ShoppingCart, Star, Clock, Sparkles, Crown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocalDateTime } from '@/hooks/useLocalDateTime';
import { GamificationWidget } from '@/components/app/GamificationWidget';
import { PlanDisplay } from '@/components/app/PlanDisplay';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Navigate } from 'react-router-dom';

export default function Dashboard() {
  const { user, subscription, refreshSubscription, isAdmin } = useAuth();
  const { toast } = useToast();
  const { formatted: currentDateTime, timezone } = useLocalDateTime({
    updateInterval: 60000,
    dateStyle: 'full',
    timeStyle: 'short',
  });

  const [stats, setStats] = useState({
    swapsUsed: 0,
    swapsQuota: 10,
    ratingsCount: 0,
    timeSaved: 0,
    daysRemaining: 0,
  });
  const [loading, setLoading] = useState(true);

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'toi';
  
  // Redirect admin to admin dashboard
  if (isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  // Check if user has active subscription
  const hasActiveSubscription = subscription && (subscription.status === 'active' || subscription.status === 'trialing');
  const isPayingUser = subscription && subscription.status === 'active';
  
  useEffect(() => {
    refreshSubscription();
    fetchUserStats();
  }, []);

  const fetchUserStats = async () => {
    if (!user) return;

    try {
      // Get swaps data for current month
      const currentMonth = new Date().toISOString().split('T')[0].slice(0, 7) + '-01';
      const { data: swapsData } = await supabase
        .from('swaps')
        .select('used, quota')
        .eq('user_id', user.id)
        .eq('month', currentMonth)
        .maybeSingle();

      // Get ratings count
      const { data: mealPlans } = await supabase
        .from('meal_plans')
        .select('id')
        .eq('user_id', user.id);

      const mealPlanIds = mealPlans?.map(p => p.id) || [];
      let ratingsCount = 0;
      
      if (mealPlanIds.length > 0) {
        const { count } = await supabase
          .from('meal_ratings')
          .select('*', { count: 'exact', head: true })
          .in('meal_plan_id', mealPlanIds);
        ratingsCount = count || 0;
      }

      // Calculate time saved (estimate: 30min per meal plan * number of meal plans)
      const timeSaved = (mealPlans?.length || 0) * 0.5; // in hours

      // Calculate days remaining in current week
      const today = new Date();
      const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const daysRemaining = 7 - dayOfWeek;

      setStats({
        swapsUsed: swapsData?.used || 0,
        swapsQuota: swapsData?.quota || 10,
        ratingsCount,
        timeSaved,
        daysRemaining,
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const isFreePlan = !subscription?.subscribed || subscription?.status === 'trialing';
  const planName = isFreePlan ? 'Gratuit' : 'Premium';
  const mealsRemaining = isFreePlan ? '3/3' : '∞';

  const handleGeneratePlan = () => {
    toast({
      title: '🎉 Menu généré !',
      description: 'Ton menu de la semaine est prêt.',
    });
    fetchUserStats(); // Refresh stats after generating plan
  };

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />

      <main className="flex-1 container py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold">
              Bienvenue, {firstName} ! 👋
            </h1>
            <div className="flex items-center gap-2">
              {!isFreePlan && <Crown className="h-5 w-5 text-yellow-500" />}
              <Badge variant={isFreePlan ? "secondary" : "default"} className="text-sm">
                {planName}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {mealsRemaining} repas
              </span>
            </div>
          </div>
          <p className="text-muted-foreground mb-1">
            Voici ton tableau de bord NutriZen
          </p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{currentDateTime}</span>
            <span className="text-xs">({timezone})</span>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Swaps restants</p>
                <p className="text-2xl font-bold">
                  {loading ? '...' : `${stats.swapsQuota - stats.swapsUsed}/${stats.swapsQuota}`}
                </p>
              </div>
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Recettes notées</p>
                <p className="text-2xl font-bold">
                  {loading ? '...' : stats.ratingsCount}
                </p>
              </div>
              <Star className="h-8 w-8 text-accent" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Temps gagné</p>
                <p className="text-2xl font-bold">
                  {loading ? '...' : `${stats.timeSaved}h`}
                </p>
              </div>
              <Clock className="h-8 w-8 text-green-500" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Jours restants</p>
                <p className="text-2xl font-bold">
                  {loading ? '...' : stats.daysRemaining}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
          </Card>
        </div>

        {/* Weekly Plan */}
        <Card className="p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Semaine en cours</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Liste de courses
              </Button>
              <Button onClick={handleGeneratePlan} size="sm">
                Régénérer la semaine
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(7)].map((_, i) => (
              <Card key={i} className="p-4 hover:shadow-glow transition-all cursor-pointer">
                <div className="aspect-video bg-gradient-to-br from-accent/20 to-primary/20 rounded-lg mb-3" />
                <h3 className="font-semibold mb-1">Jour {i + 1}</h3>
                <p className="text-sm text-muted-foreground mb-2">Poulet au curry</p>
                <p className="text-xs text-muted-foreground mb-3">⏱️ 30 min</p>
                <Button variant="outline" size="sm" className="w-full">
                  Voir la recette
                </Button>
              </Card>
            ))}
          </div>
        </Card>

        {/* Gamification Widget - Only for paying users */}
        {!isFreePlan && (
          <div className="mb-8">
            <GamificationWidget />
          </div>
        )}

        {/* Daily Tip */}
        <Card className="p-6 bg-gradient-to-br from-accent/10 to-primary/10">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold mb-2">💡 Astuce du jour</h3>
              <p className="text-muted-foreground">
                Prépare tes légumes le dimanche pour gagner 15 minutes par jour toute la semaine !
              </p>
            </div>
          </div>
        </Card>
      </main>

      <AppFooter />
    </div>
  );
}
