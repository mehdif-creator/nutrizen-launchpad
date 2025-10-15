import { AppHeader } from '@/components/app/AppHeader';
import { AppFooter } from '@/components/app/AppFooter';
import { Card } from '@/components/ui/card';
import { Users, Ticket, DollarSign, TrendingUp, Crown, Star, Calendar, Activity } from 'lucide-react';
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
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Total users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Active subscribers
      const { count: activeSubscribers } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Trial users
      const { count: trialUsers } = await supabase
        .from('subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'trialing');

      // Total points across all users
      const { data: pointsData } = await supabase
        .from('user_points')
        .select('total_points');
      const totalPoints = pointsData?.reduce((sum, user) => sum + user.total_points, 0) || 0;

      // Total meal plans
      const { count: totalMealPlans } = await supabase
        .from('meal_plans')
        .select('*', { count: 'exact', head: true });

      // Total ratings
      const { count: totalRatings } = await supabase
        .from('meal_ratings')
        .select('*', { count: 'exact', head: true });

      // Open tickets
      const { count: openTickets } = await supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'open');

      setStats({
        totalUsers: totalUsers || 0,
        activeSubscribers: activeSubscribers || 0,
        trialUsers: trialUsers || 0,
        totalPoints,
        totalMealPlans: totalMealPlans || 0,
        totalRatings: totalRatings || 0,
        openTickets: openTickets || 0,
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
        <AppHeader />
        <main className="flex-1 container py-8">
          <div className="text-center">Chargement des statistiques...</div>
        </main>
        <AppFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />

      <main className="flex-1 container py-8">
        <h1 className="text-3xl font-bold mb-8">Dashboard Administrateur</h1>

        {/* Main Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Utilisateurs totaux</p>
                <p className="text-3xl font-bold">{stats.totalUsers}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {stats.trialUsers} en essai
                </p>
              </div>
              <Users className="h-10 w-10 text-primary" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Abonnés actifs</p>
                <p className="text-3xl font-bold">{stats.activeSubscribers}</p>
                <p className="text-sm text-green-600">
                  {stats.totalUsers > 0 
                    ? ((stats.activeSubscribers / stats.totalUsers) * 100).toFixed(1)
                    : 0}% de conversion
                </p>
              </div>
              <Crown className="h-10 w-10 text-accent" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Menus créés</p>
                <p className="text-3xl font-bold">{stats.totalMealPlans}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {stats.totalRatings} notations
                </p>
              </div>
              <Calendar className="h-10 w-10 text-green-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tickets ouverts</p>
                <p className="text-3xl font-bold">{stats.openTickets}</p>
                <p className="text-sm text-amber-600">Support en attente</p>
              </div>
              <Ticket className="h-10 w-10 text-blue-500" />
            </div>
          </Card>
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Points gamification</p>
                <p className="text-3xl font-bold">{stats.totalPoints.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Total cumulé par tous les utilisateurs
                </p>
              </div>
              <Star className="h-10 w-10 text-yellow-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Engagement moyen</p>
                <p className="text-3xl font-bold">
                  {stats.totalUsers > 0 
                    ? (stats.totalMealPlans / stats.totalUsers).toFixed(1)
                    : 0}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Menus par utilisateur
                </p>
              </div>
              <Activity className="h-10 w-10 text-purple-500" />
            </div>
          </Card>
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
              <Link to="/admin/tickets">
                <Button variant="outline" className="w-full justify-start">
                  <Ticket className="mr-2 h-4 w-4" />
                  Gérer les tickets
                </Button>
              </Link>
              <Link to="/admin/billing">
                <Button variant="outline" className="w-full justify-start">
                  <DollarSign className="mr-2 h-4 w-4" />
                  Facturation
                </Button>
              </Link>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Configuration</h2>
            <div className="space-y-3">
              <Link to="/admin/feature-flags">
                <Button variant="outline" className="w-full justify-start">
                  Feature Flags
                </Button>
              </Link>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={fetchStats}
              >
                <TrendingUp className="mr-2 h-4 w-4" />
                Actualiser les stats
              </Button>
            </div>
          </Card>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
