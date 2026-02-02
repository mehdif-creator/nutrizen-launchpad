import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, CalendarDays, Percent, TrendingUp } from 'lucide-react';
import {
  DateRange,
  Granularity,
  getDateRange,
  fetchNewUsersSummary,
  fetchNewUsersTimeseries,
  fetchUsersBreakdown,
  exportToCsv,
} from '@/lib/adminKpis';
import { KpiDetailLayout } from '@/components/admin/kpis/KpiDetailLayout';
import { SummaryTile, SummaryTilesGrid } from '@/components/admin/kpis/SummaryTile';
import { LineChartCard } from '@/components/admin/kpis/charts/LineChartCard';
import { BarChartCard } from '@/components/admin/kpis/charts/BarChartCard';

export default function KpiNewUsers() {
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [granularity, setGranularity] = useState<Granularity>('day');
  const { toast } = useToast();

  const { from, to } = getDateRange(dateRange);
  const filters = { dateFrom: from, dateTo: to, granularity };

  const { data: summary, isLoading: loadingSummary, refetch: refetchSummary } = useQuery({
    queryKey: ['kpi-new-users-summary', from, to],
    queryFn: () => fetchNewUsersSummary(filters),
  });

  const { data: timeseries, isLoading: loadingTimeseries, refetch: refetchTimeseries } = useQuery({
    queryKey: ['kpi-new-users-timeseries', from, to, granularity],
    queryFn: () => fetchNewUsersTimeseries(filters),
  });

  const { data: breakdown, isLoading: loadingBreakdown, refetch: refetchBreakdown } = useQuery({
    queryKey: ['kpi-new-users-breakdown', from, to],
    queryFn: () => fetchUsersBreakdown(filters),
  });

  const isLoading = loadingSummary || loadingTimeseries || loadingBreakdown;

  const handleRefresh = () => {
    refetchSummary();
    refetchTimeseries();
    refetchBreakdown();
    toast({ title: 'Données actualisées' });
  };

  const handleExport = () => {
    if (breakdown) {
      exportToCsv(breakdown, 'new_users_breakdown');
      toast({ title: 'Export CSV généré' });
    }
  };

  return (
    <KpiDetailLayout
      title="Nouveaux Utilisateurs"
      subtitle="Acquisition et activation des nouveaux inscrits"
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
      granularity={granularity}
      onGranularityChange={setGranularity}
      onRefresh={handleRefresh}
      onExport={handleExport}
      isLoading={isLoading}
    >
      {/* Summary Tiles */}
      <SummaryTilesGrid>
        <SummaryTile
          title="Nouveaux (période)"
          value={summary?.new_users || 0}
          icon={UserPlus}
          iconColor="text-blue-500"
          isLoading={loadingSummary}
        />
        <SummaryTile
          title="Cette semaine"
          value={summary?.new_users_week || 0}
          icon={CalendarDays}
          iconColor="text-green-500"
          isLoading={loadingSummary}
        />
        <SummaryTile
          title="Taux d'activation"
          value={`${summary?.activation_rate.toFixed(1) || 0}%`}
          subtitle="Onboarding complété"
          icon={Percent}
          iconColor="text-purple-500"
          isLoading={loadingSummary}
        />
        <SummaryTile
          title="Rythme quotidien"
          value={(summary?.new_users || 0) / 30}
          subtitle="Moyenne 30j"
          icon={TrendingUp}
          iconColor="text-amber-500"
          isLoading={loadingSummary}
        />
      </SummaryTilesGrid>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <LineChartCard
          title="Inscriptions dans le temps"
          description="Nombre de nouvelles inscriptions par période"
          data={timeseries || []}
          isLoading={loadingTimeseries}
        />
        <BarChartCard
          title="Par locale/pays"
          description="Répartition géographique des nouveaux utilisateurs"
          data={breakdown || []}
          isLoading={loadingBreakdown}
        />
      </div>
    </KpiDetailLayout>
  );
}
