import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Activity, BarChart3, Users, TrendingUp } from 'lucide-react';
import {
  DateRange,
  Granularity,
  getDateRange,
  fetchMenusPerUserSummary,
  fetchMenusPerUserDistribution,
  fetchMenusTimeseries,
  exportToCsv,
} from '@/lib/adminKpis';
import { KpiDetailLayout } from '@/components/admin/kpis/KpiDetailLayout';
import { SummaryTile, SummaryTilesGrid } from '@/components/admin/kpis/SummaryTile';
import { LineChartCard } from '@/components/admin/kpis/charts/LineChartCard';
import { BarChartCard } from '@/components/admin/kpis/charts/BarChartCard';

export default function KpiMenusPerUser() {
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [granularity, setGranularity] = useState<Granularity>('day');
  const { toast } = useToast();

  const { from, to } = getDateRange(dateRange);
  const filters = { dateFrom: from, dateTo: to, granularity };

  const { data: summary, isLoading: loadingSummary, refetch: refetchSummary } = useQuery({
    queryKey: ['kpi-menus-per-user-summary', from, to],
    queryFn: () => fetchMenusPerUserSummary(filters),
  });

  const { data: distribution, isLoading: loadingDistribution, refetch: refetchDistribution } = useQuery({
    queryKey: ['kpi-menus-per-user-distribution', from, to],
    queryFn: () => fetchMenusPerUserDistribution(filters),
  });

  const { data: timeseries, isLoading: loadingTimeseries, refetch: refetchTimeseries } = useQuery({
    queryKey: ['kpi-menus-per-user-timeseries', from, to, granularity],
    queryFn: () => fetchMenusTimeseries(filters),
  });

  const isLoading = loadingSummary || loadingDistribution || loadingTimeseries;

  const handleRefresh = () => {
    refetchSummary();
    refetchDistribution();
    refetchTimeseries();
    toast({ title: 'Données actualisées' });
  };

  const handleExport = () => {
    if (distribution) {
      exportToCsv(distribution, 'menus_per_user_distribution');
      toast({ title: 'Export CSV généré' });
    }
  };

  return (
    <KpiDetailLayout
      title="Menus par Utilisateur"
      subtitle="Profondeur d'engagement et usage"
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
          title="Moyenne"
          value={(summary?.avg_menus_per_user || 0).toFixed(1)}
          subtitle="Menus par utilisateur"
          icon={Activity}
          iconColor="text-purple-500"
          isLoading={loadingSummary}
        />
        <SummaryTile
          title="Médiane"
          value={summary?.median_menus_per_user || 0}
          icon={BarChart3}
          iconColor="text-blue-500"
          isLoading={loadingSummary}
        />
        <SummaryTile
          title="P90"
          value={summary?.p90_menus_per_user || 0}
          subtitle="90ème percentile"
          icon={TrendingUp}
          iconColor="text-green-500"
          isLoading={loadingSummary}
        />
        <SummaryTile
          title="Utilisateurs actifs"
          value={summary?.active_users || 0}
          icon={Users}
          iconColor="text-amber-500"
          isLoading={loadingSummary}
        />
      </SummaryTilesGrid>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <LineChartCard
          title="Évolution dans le temps"
          description="Nombre de menus créés par période"
          data={timeseries || []}
          isLoading={loadingTimeseries}
        />
        <BarChartCard
          title="Distribution"
          description="Répartition des utilisateurs par nombre de menus"
          data={distribution || []}
          isLoading={loadingDistribution}
          horizontal
        />
      </div>
    </KpiDetailLayout>
  );
}
