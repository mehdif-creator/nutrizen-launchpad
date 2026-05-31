import { AppFooter } from '@/components/app/AppFooter';
import { Card } from '@/components/ui/card';
import {
  Users,
  Ticket,
  TrendingUp,
  Crown,
  Star,
  Calendar,
  Activity,
  Percent,
  Euro,
  UserMinus,
  UserPlus,
  BarChart3,
  Stethoscope,
  Zap,
  FileText,
  Mail,
  ImageIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { KpiCardLink } from '@/components/admin/kpis/KpiCardLink';
import { EmailCampaignSection } from '@/components/admin/EmailCampaignSection';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  useAdminDashboardStats,
  fmtEUR,
  fmtPct,
  fmtNum,
  fmtDec,
} from '@/hooks/useAdminDashboardStats';

export default function AdminDashboard() {
  const { data, loading, error, refresh } = useAdminDashboardStats();
  const [mailingOpen, setMailingOpen] = useState(false);

  const f = data?.financial;
  const u = data?.users;
  const eng = data?.engagement;

  if (loading && !data) {
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
          <Button onClick={refresh} variant="outline">
            <TrendingUp className="mr-2 h-4 w-4" />
            Actualiser
          </Button>
        </div>
        {error && (
          <div className="mb-4 text-sm text-muted-foreground">
            Certaines statistiques n'ont pas pu être chargées.
          </div>
        )}


        {/* Revenue Metrics */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Métriques Financières</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <KpiCardLink
              to="/admin/kpis/mrr"
              title="MRR"
              value={fmtEUR(f?.mrr ?? null)}
              subtitle="Revenue mensuel récurrent"
              icon={Euro}
              iconColor="text-green-500"
            />
            <KpiCardLink
              to="/admin/kpis/arpu"
              title="ARPU"
              value={fmtEUR(f?.arpu ?? null)}
              subtitle="Revenue moyen par utilisateur"
              icon={BarChart3}
              iconColor="text-blue-500"
            />
            <KpiCardLink
              to="/admin/kpis/conversion"
              title="Taux de conversion"
              value={fmtPct(f?.trialToPaidConversionRate ?? null)}
              subtitle="Trial → Paid"
              icon={Percent}
              iconColor="text-purple-500"
            />
            <KpiCardLink
              to="/admin/kpis/churn"
              title="Taux de churn"
              value={fmtPct(f?.churnRate ?? null)}
              subtitle={`${fmtNum(f?.cancellationsCount ?? null)} annulations`}
              icon={UserMinus}
              iconColor="text-red-500"
            />
          </div>
        </div>

        {/* User Metrics */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Métriques Utilisateurs</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <KpiCardLink
              to="/admin/kpis/users-total"
              title="Utilisateurs totaux"
              value={fmtNum(u?.totalUsers ?? null)}
              subtitle={`${fmtNum(u?.trialUsers ?? null)} en essai`}
              icon={Users}
              iconColor="text-primary"
            />
            <KpiCardLink
              to="/admin/kpis/subscribers-active"
              title="Abonnés actifs"
              value={fmtNum(u?.activeSubscribers ?? null)}
              subtitle="Payants"
              icon={Crown}
              iconColor="text-accent"
            />
            <KpiCardLink
              to="/admin/kpis/new-users"
              title="Nouveaux ce mois"
              value={fmtNum(u?.newUsersThisMonth ?? null)}
              subtitle={`${fmtNum(u?.newUsersThisWeek ?? null)} cette semaine`}
              icon={UserPlus}
              iconColor="text-blue-500"
            />
            <KpiCardLink
              to="/admin/kpis/tickets-open"
              title="Tickets ouverts"
              value={fmtNum(u?.openTickets ?? null)}
              subtitle="Support en attente"
              icon={Ticket}
              iconColor="text-orange-500"
            />
          </div>
        </div>

        {/* Engagement Metrics */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Métriques d'Engagement</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <KpiCardLink
              to="/admin/kpis/menus-created"
              title="Menus créés"
              value={fmtNum(eng?.totalMenusCreated ?? null)}
              subtitle="Total"
              icon={Calendar}
              iconColor="text-green-500"
            />
            <KpiCardLink
              to="/admin/kpis/menus-per-user"
              title="Menus/utilisateur"
              value={fmtDec(eng?.menusPerUserAvg ?? null, 1)}
              subtitle="Moyenne"
              icon={Activity}
              iconColor="text-purple-500"
            />
            <KpiCardLink
              to="/admin/kpis/ratings"
              title="Notations"
              value={fmtNum(eng?.ratingsCount ?? null)}
              subtitle={`${fmtDec(eng?.ratingsAvg ?? null, 1)} ⭐ moyenne`}
              icon={Star}
              iconColor="text-yellow-500"
            />
            <KpiCardLink
              to="/admin/kpis/points-total"
              title="Points totaux"
              value={fmtNum(eng?.totalPoints ?? null)}
              subtitle="Gamification"
              icon={Star}
              iconColor="text-amber-500"
            />
          </div>
        </div>


        {/* Mailing Dialog */}
        <Dialog open={mailingOpen} onOpenChange={setMailingOpen}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                Gestion Mailing
              </DialogTitle>
            </DialogHeader>
            <EmailCampaignSection embedded />
          </DialogContent>
        </Dialog>

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
              <Link to="/admin/diagnostics">
                <Button variant="outline" className="w-full justify-start">
                  <Stethoscope className="mr-2 h-4 w-4" />
                  Diagnostics QA
                </Button>
              </Link>
              <Link to="/admin/referrals">
                <Button variant="outline" className="w-full justify-start">
                  <Users className="mr-2 h-4 w-4" />
                  Parrainage
                </Button>
              </Link>
              <Link to="/admin/conversion">
                <Button variant="outline" className="w-full justify-start">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Funnel de conversion
                </Button>
              </Link>
              {/* NutriZen Automation masqué du dashboard — route toujours active
              <Link to="/admin/automation"><Button variant="outline" className="w-full justify-start"><Zap className="mr-2 h-4 w-4" />NutriZen Automation</Button></Link>
              */}
              <Link to="/admin/seo-factory">
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="mr-2 h-4 w-4" />
                  SEO Factory
                </Button>
              </Link>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setMailingOpen(true)}
              >
                <Mail className="mr-2 h-4 w-4" />
                Mailing
              </Button>
              <Link to="/admin/posts-manu-rs">
                <Button variant="outline" className="w-full justify-start">
                  <ImageIcon className="mr-2 h-4 w-4" />
                  Posts manu RS
                </Button>
              </Link>
            </div>
          </Card>
          {/* Configuration section hidden — kept for future use
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Configuration</h2>
            <div className="space-y-3">
              <Link to="/admin/macros-maintenance"><Button variant="outline" className="w-full justify-start"><BarChart3 className="mr-2 h-4 w-4" />Maintenance Macros</Button></Link>
            </div>
          </Card>
          */}
        </div>
      </main>
      <AppFooter />
    </div>
  );
}
