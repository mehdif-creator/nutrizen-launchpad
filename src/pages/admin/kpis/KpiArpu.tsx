import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { BarChart3, Users, Euro, TrendingUp } from 'lucide-react';
import {
  DateRange,
  Granularity,
  getDateRange,
  fetchArpuSummary,
  fetchArpuTimeseries,
  fetchMrrByPlan,
  exportToCsv,
} from '@/lib/adminKpis';
import { KpiDetailLayout } from '@/components/admin/kpis/KpiDetailLayout';
import { SummaryTile, SummaryTilesGrid } from '@/components/admin/kpis/SummaryTile';
import { LineChartCard } from '@/components/admin/kpis/charts/LineChartCard';
import { BarChartCard } from '@/components/admin/kpis/charts/BarChartCard';

export default function KpiArpu() {
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [granularity, setGranularity] = useState<Granularity>('day');
  const { toast } = useToast();

  const { from, to } = getDateRange(dateRange);
  const filters = { dateFrom: from, dateTo: to, granularity };

  const { data: summary, isLoading: loadingSummary, refetch: refetchSummary } = useQuery({
    queryKey: ['kpi-arpu-summary', from, to],
    queryFn: () => fetchArpuSummary(filters),
  });

  const { data: timeseries, isLoading: loadingTimeseries, refetch: refetchTimeseries } = useQuery({
    queryKey: ['kpi-arpu-timeseries', from, to, granularity],
    queryFn: () => fetchArpuTimeseries(filters),
  });

  const { data: byPlan, isLoading: loadingByPlan, refetch: refetchByPlan } = useQuery({
    queryKey: ['kpi-arpu-by-plan', from, to],
    queryFn: () => fetchMrrByPlan(filters),
  });

  const isLoading = loadingSummary || loadingTimeseries || loadingByPlan;

  const handleRefresh = () => {
    refetchSummary();
    refetchTimeseries();
    refetchByPlan();
    toast({ title: 'Données actualisées' });
  };

  const handleExport = () => {
    if (byPlan) {
      exportToCsv(byPlan, 'arpu_by_plan');
      toast({ title: 'Export CSV généré' });
    }
  };

  const change = summary ? ((summary.arpu_current - summary.arpu_previous) / (summary.arpu_previous || 1)) * 100 : 0;

  return (
    <KpiDetailLayout
      title="ARPU — Revenue Moyen par Utilisateur"
      subtitle="Suivi de la valeur moyenne par utilisateur"
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
          title="ARPU actuel"
          value={`${summary?.arpu_current.toFixed(2) || 0}€`}
          icon={BarChart3}
          iconColor="text-blue-500"
          trend={{ value: change }}
          isLoading={loadingSummary}
        />
        <SummaryTile
          title="ARPU précédent"
          value={`${summary?.arpu_previous.toFixed(2) || 0}€`}
          icon={BarChart3}
          iconColor="text-muted-foreground"
          isLoading={loadingSummary}
        />
        <SummaryTile
          title="Utilisateurs actifs"
          value={summary?.active_users || 0}
          icon={Users}
          iconColor="text-green-500"
          isLoading={loadingSummary}
        />
        <SummaryTile
          title="Revenue total"
          value={`${summary?.total_revenue.toFixed(2) || 0}€`}
          icon={Euro}
          iconColor="text-amber-500"
          isLoading={loadingSummary}
        />
      </SummaryTilesGrid>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <LineChartCard
          title="ARPU dans le temps"
          description="Évolution du revenue moyen par utilisateur"
          data={timeseries || []}
          isLoading={loadingTimeseries}
          formatValue={(v) => `${v.toFixed(2)}€`}
        />
        <BarChartCard
          title="ARPU par plan"
          description="Revenue moyen par type d'abonnement"
          data={byPlan || []}
          isLoading={loadingByPlan}
          formatValue={(v) => `${v.toFixed(2)}€`}
        />
      </div>
    </KpiDetailLayout>
  );
}
