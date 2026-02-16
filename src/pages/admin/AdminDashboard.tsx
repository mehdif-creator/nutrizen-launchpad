import { AppFooter } from '@/components/app/AppFooter';
import { Card } from '@/components/ui/card';
import { Users, Ticket, TrendingUp, Crown, Star, Calendar, Activity, Percent, Euro, UserMinus, UserPlus, BarChart3, Stethoscope, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { KpiCardLink } from '@/components/admin/kpis/KpiCardLink';

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
    const safeQuery = async <T,>(fn: () => Promise<T> | PromiseLike<T>, fallback: T): Promise<T> => {
      try { return await fn(); } catch { return fallback; }
    };

    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - 7);

      const [
        totalUsers, activeSubscribers, trialUsers, canceledSubscriptions,
        newUsersThisMonth, newUsersThisWeek, totalPoints, totalMealPlans, ratingsObj, openTickets
      ] = await Promise.all([
        safeQuery(async () => (await supabase.from('profiles').select('*', { count: 'exact', head: true })).count ?? 0, 0),
        safeQuery(async () => (await (supabase.from as any)('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active')).count ?? 0, 0),
        safeQuery(async () => (await (supabase.from as any)('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'trialing')).count ?? 0, 0),
        safeQuery(async () => (await (supabase.from as any)('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'canceled')).count ?? 0, 0),
        safeQuery(async () => (await supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', startOfMonth.toISOString())).count ?? 0, 0),
        safeQuery(async () => (await supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', startOfWeek.toISOString())).count ?? 0, 0),
        safeQuery(async () => { const r = await (supabase.from as any)('user_points').select('total_points'); return r.data?.reduce((s: number, u: any) => s + (u.total_points || 0), 0) ?? 0; }, 0),
        safeQuery(async () => (await supabase.from('meal_plans').select('*', { count: 'exact', head: true })).count ?? 0, 0),
        safeQuery(async () => { const r = await supabase.from('meal_ratings').select('stars', { count: 'exact' }); return { count: r.count ?? 0, avg: r.data && r.data.length > 0 ? r.data.reduce((s, rr) => s + (rr.stars || 0), 0) / r.data.length : 0 }; }, { count: 0, avg: 0 }),
        safeQuery(async () => (await (supabase.from as any)('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'open')).count ?? 0, 0),
      ]);

      const pricePerMonth = 19.99;
      const mrr = activeSubscribers * pricePerMonth;
      const arpu = totalUsers > 0 ? mrr / totalUsers : 0;
      const totalSubs = activeSubscribers + canceledSubscriptions;
      const churnRate = totalSubs > 0 ? (canceledSubscriptions / totalSubs) * 100 : 0;
      const conversionRate = totalUsers > 0 ? (activeSubscribers / totalUsers) * 100 : 0;
      const avgMealPlansPerUser = totalUsers > 0 ? totalMealPlans / totalUsers : 0;

      setStats({
        totalUsers, activeSubscribers, trialUsers,
        totalPoints, totalMealPlans, totalRatings: ratingsObj.count,
        openTickets, mrr, arpu, churnRate, conversionRate,
        newUsersThisMonth, newUsersThisWeek,
        canceledSubscriptions, avgMealPlansPerUser, avgRatingScore: ratingsObj.avg,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast({ title: 'Erreur', description: 'Impossible de charger les statistiques', variant: 'destructive' });
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
            <KpiCardLink to="/admin/kpis/mrr" title="MRR" value={`${stats.mrr.toFixed(2)}€`} subtitle="Revenue mensuel récurrent" icon={Euro} iconColor="text-green-500" />
            <KpiCardLink to="/admin/kpis/arpu" title="ARPU" value={`${stats.arpu.toFixed(2)}€`} subtitle="Revenue moyen par utilisateur" icon={BarChart3} iconColor="text-blue-500" />
            <KpiCardLink to="/admin/kpis/conversion" title="Taux de conversion" value={`${stats.conversionRate.toFixed(1)}%`} subtitle="Trial → Paid" icon={Percent} iconColor="text-purple-500" />
            <KpiCardLink to="/admin/kpis/churn" title="Taux de churn" value={`${stats.churnRate.toFixed(1)}%`} subtitle={`${stats.canceledSubscriptions} annulations`} icon={UserMinus} iconColor="text-red-500" />
          </div>
        </div>

        {/* User Metrics */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Métriques Utilisateurs</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <KpiCardLink to="/admin/kpis/users-total" title="Utilisateurs totaux" value={stats.totalUsers} subtitle={`${stats.trialUsers} en essai`} icon={Users} iconColor="text-primary" />
            <KpiCardLink to="/admin/kpis/subscribers-active" title="Abonnés actifs" value={stats.activeSubscribers} subtitle="Payants" icon={Crown} iconColor="text-accent" />
            <KpiCardLink to="/admin/kpis/new-users" title="Nouveaux ce mois" value={stats.newUsersThisMonth} subtitle={`${stats.newUsersThisWeek} cette semaine`} icon={UserPlus} iconColor="text-blue-500" />
            <KpiCardLink to="/admin/kpis/tickets-open" title="Tickets ouverts" value={stats.openTickets} subtitle="Support en attente" icon={Ticket} iconColor="text-orange-500" />
          </div>
        </div>

        {/* Engagement Metrics */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Métriques d'Engagement</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <KpiCardLink to="/admin/kpis/menus-created" title="Menus créés" value={stats.totalMealPlans} subtitle="Total" icon={Calendar} iconColor="text-green-500" />
            <KpiCardLink to="/admin/kpis/menus-per-user" title="Menus/utilisateur" value={stats.avgMealPlansPerUser.toFixed(1)} subtitle="Moyenne" icon={Activity} iconColor="text-purple-500" />
            <KpiCardLink to="/admin/kpis/ratings" title="Notations" value={stats.totalRatings} subtitle={`${stats.avgRatingScore.toFixed(1)} ⭐ moyenne`} icon={Star} iconColor="text-yellow-500" />
            <KpiCardLink to="/admin/kpis/points-total" title="Points totaux" value={stats.totalPoints.toLocaleString()} subtitle="Gamification" icon={Star} iconColor="text-amber-500" />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Gestion</h2>
            <div className="space-y-3">
              <Link to="/admin/users"><Button variant="outline" className="w-full justify-start"><Users className="mr-2 h-4 w-4" />Gérer les utilisateurs</Button></Link>
              <Link to="/admin/onboarding"><Button variant="outline" className="w-full justify-start"><Activity className="mr-2 h-4 w-4" />Statistiques d'onboarding</Button></Link>
              <Link to="/admin/tickets"><Button variant="outline" className="w-full justify-start"><Ticket className="mr-2 h-4 w-4" />Gérer les tickets</Button></Link>
              <Link to="/admin/diagnostics"><Button variant="outline" className="w-full justify-start"><Stethoscope className="mr-2 h-4 w-4" />Diagnostics QA</Button></Link>
              <Link to="/admin/referrals"><Button variant="outline" className="w-full justify-start"><Users className="mr-2 h-4 w-4" />Parrainage</Button></Link>
              <Link to="/admin/conversion"><Button variant="outline" className="w-full justify-start"><TrendingUp className="mr-2 h-4 w-4" />Funnel de conversion</Button></Link>
              <Link to="/admin/automation"><Button variant="outline" className="w-full justify-start"><Zap className="mr-2 h-4 w-4" />NutriZen Automation</Button></Link>
            </div>
          </Card>
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Configuration</h2>
            <div className="space-y-3">
              <Link to="/admin/macros-maintenance"><Button variant="outline" className="w-full justify-start"><BarChart3 className="mr-2 h-4 w-4" />Maintenance Macros</Button></Link>
            </div>
          </Card>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}
