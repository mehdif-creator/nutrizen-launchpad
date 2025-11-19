import { AppFooter } from '@/components/app/AppFooter';
import { Card } from '@/components/ui/card';
import { Users, Ticket, DollarSign, TrendingUp, Crown, Star, Calendar, Activity, Percent, Euro, UserMinus, UserPlus, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Stats {
  totalUsers: number;
  activeSubscribers: number;
  trialUsers: number;
  totalPoints: number;
  totalMealPlans: number;
  totalRatings: number;
  openTickets: number;
  mrr: number;
  arpu: number;
  churnRate: number;
  conversionRate: number;
  newUsersThisMonth: number;
  newUsersThisWeek: number;
  canceledSubscriptions: number;
  avgMealPlansPerUser: number;
  avgRatingScore: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    activeSubscribers: 0,
    trialUsers: 0,
    totalPoints: 0,
    totalMealPlans: 0,
    totalRatings: 0,
    openTickets: 0,
    mrr: 0,
    arpu: 0,
    churnRate: 0,
    conversionRate: 0,
    newUsersThisMonth: 0,
    newUsersThisWeek: 0,
    canceledSubscriptions: 0,
    avgMealPlansPerUser: 0,
    avgRatingScore: 0,
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - 7);

      // Total users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Active subscribers
      const { count: activeSubscribers, data: activeSubsData } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact' })
        .eq('status', 'active');

      // Trial users
      const { count: trialUsers } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'trialing');

      // Canceled subscriptions (for churn)
      const { count: canceledSubscriptions } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'canceled');

      // New users this month
      const { count: newUsersThisMonth } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfMonth.toISOString());

      // New users this week
      const { count: newUsersThisWeek } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfWeek.toISOString());

      // Total points across all users
      const { data: pointsData } = await supabase
        .from('user_points')
        .select('total_points');
      const totalPoints = pointsData?.reduce((sum, user) => sum + user.total_points, 0) || 0;

      // Total meal plans
      const { count: totalMealPlans } = await supabase
        .from('meal_plans')
        .select('*', { count: 'exact', head: true });

      // Ratings data
      const { count: totalRatings, data: ratingsData } = await supabase
        .from('meal_ratings')
        .select('stars', { count: 'exact' });
      
      const avgRatingScore = ratingsData && ratingsData.length > 0
        ? ratingsData.reduce((sum, r) => sum + (r.stars || 0), 0) / ratingsData.length
        : 0;

      // Open tickets
      const { count: openTickets } = await supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'open');

      // Calculate financial metrics
      // MRR: Assuming 19.99€ per active subscription
      const pricePerMonth = 19.99;
      const mrr = (activeSubscribers || 0) * pricePerMonth;

      // ARPU: Average Revenue Per User
      const arpu = totalUsers && totalUsers > 0 ? mrr / totalUsers : 0;

      // Churn Rate: (canceled / (active + canceled)) * 100
      const totalSubs = (activeSubscribers || 0) + (canceledSubscriptions || 0);
      const churnRate = totalSubs > 0 ? ((canceledSubscriptions || 0) / totalSubs) * 100 : 0;

      // Conversion Rate: (active / total users) * 100
      const conversionRate = totalUsers && totalUsers > 0 
        ? ((activeSubscribers || 0) / totalUsers) * 100 
        : 0;

      // Avg meal plans per user
      const avgMealPlansPerUser = totalUsers && totalUsers > 0 
        ? (totalMealPlans || 0) / totalUsers 
        : 0;

      setStats({
        totalUsers: totalUsers || 0,
        activeSubscribers: activeSubscribers || 0,
        trialUsers: trialUsers || 0,
        totalPoints,
        totalMealPlans: totalMealPlans || 0,
        totalRatings: totalRatings || 0,
        openTickets: openTickets || 0,
        mrr,
        arpu,
        churnRate,
        conversionRate,
        newUsersThisMonth: newUsersThisMonth || 0,
        newUsersThisWeek: newUsersThisWeek || 0,
        canceledSubscriptions: canceledSubscriptions || 0,
        avgMealPlansPerUser,
        avgRatingScore,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les statistiques',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <main className="flex-1 container py-8">
          <div className="text-center">Chargement des statistiques...</div>
        </main>
        <AppFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 container py-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-4xl font-bold">Dashboard Administrateur</h1>
          <Button onClick={fetchStats} variant="outline">
            <TrendingUp className="mr-2 h-4 w-4" />
            Actualiser
          </Button>
        </div>

        {/* Revenue Metrics */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Métriques Financières</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">MRR</p>
                  <p className="text-3xl font-bold">{stats.mrr.toFixed(2)}€</p>
                  <p className="text-sm text-muted-foreground mt-1">Revenue mensuel récurrent</p>
                </div>
                <Euro className="h-10 w-10 text-green-500" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">ARPU</p>
                  <p className="text-3xl font-bold">{stats.arpu.toFixed(2)}€</p>
                  <p className="text-sm text-muted-foreground mt-1">Revenue moyen par utilisateur</p>
                </div>
                <BarChart3 className="h-10 w-10 text-blue-500" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Taux de conversion</p>
                  <p className="text-3xl font-bold">{stats.conversionRate.toFixed(1)}%</p>
                  <p className="text-sm text-green-600">Trial → Paid</p>
                </div>
                <Percent className="h-10 w-10 text-purple-500" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Taux de churn</p>
                  <p className="text-3xl font-bold">{stats.churnRate.toFixed(1)}%</p>
                  <p className="text-sm text-amber-600">{stats.canceledSubscriptions} annulations</p>
                </div>
                <UserMinus className="h-10 w-10 text-red-500" />
              </div>
            </Card>
          </div>
        </div>

        {/* User Metrics */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Métriques Utilisateurs</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Utilisateurs totaux</p>
                  <p className="text-3xl font-bold">{stats.totalUsers}</p>
                  <p className="text-sm text-muted-foreground mt-1">{stats.trialUsers} en essai</p>
                </div>
                <Users className="h-10 w-10 text-primary" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Abonnés actifs</p>
                  <p className="text-3xl font-bold">{stats.activeSubscribers}</p>
                  <p className="text-sm text-green-600">Payants</p>
                </div>
                <Crown className="h-10 w-10 text-accent" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Nouveaux ce mois</p>
                  <p className="text-3xl font-bold">{stats.newUsersThisMonth}</p>
                  <p className="text-sm text-muted-foreground mt-1">{stats.newUsersThisWeek} cette semaine</p>
                </div>
                <UserPlus className="h-10 w-10 text-blue-500" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tickets ouverts</p>
                  <p className="text-3xl font-bold">{stats.openTickets}</p>
                  <p className="text-sm text-amber-600">Support en attente</p>
                </div>
                <Ticket className="h-10 w-10 text-orange-500" />
              </div>
            </Card>
          </div>
        </div>

        {/* Engagement Metrics */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Métriques d'Engagement</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Menus créés</p>
                  <p className="text-3xl font-bold">{stats.totalMealPlans}</p>
                  <p className="text-sm text-muted-foreground mt-1">Total</p>
                </div>
                <Calendar className="h-10 w-10 text-green-500" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Menus/utilisateur</p>
                  <p className="text-3xl font-bold">{stats.avgMealPlansPerUser.toFixed(1)}</p>
                  <p className="text-sm text-muted-foreground mt-1">Moyenne</p>
                </div>
                <Activity className="h-10 w-10 text-purple-500" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Notations</p>
                  <p className="text-3xl font-bold">{stats.totalRatings}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {stats.avgRatingScore.toFixed(1)} ⭐ moyenne
                  </p>
                </div>
                <Star className="h-10 w-10 text-yellow-500" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Points totaux</p>
                  <p className="text-3xl font-bold">{stats.totalPoints.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground mt-1">Gamification</p>
                </div>
                <Star className="h-10 w-10 text-amber-500" />
              </div>
            </Card>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Gestion</h2>
            <div className="space-y-3">
              <Link to="/admin/users">
                <Button variant="outline" className="w-full justify-start">
                  <Users className="mr-2 h-4 w-4" />
                  Gérer les utilisateurs
                </Button>
              </Link>
              <Link to="/admin/onboarding">
                <Button variant="outline" className="w-full justify-start">
                  <Activity className="mr-2 h-4 w-4" />
                  Statistiques d'onboarding
                </Button>
              </Link>
              <Link to="/admin/tickets">
                <Button variant="outline" className="w-full justify-start">
                  <Ticket className="mr-2 h-4 w-4" />
                  Gérer les tickets
                </Button>
              </Link>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Configuration</h2>
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start" disabled>
                <DollarSign className="mr-2 h-4 w-4" />
                Facturation (à venir)
              </Button>
            </div>
          </Card>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
