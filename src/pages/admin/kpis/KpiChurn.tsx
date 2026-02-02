import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { UserMinus, Percent, Shield, Clock } from 'lucide-react';
import {
  DateRange,
  Granularity,
  getDateRange,
  fetchChurnSummary,
  fetchChurnTimeseries,
  fetchMrrByPlan,
  exportToCsv,
} from '@/lib/adminKpis';
import { KpiDetailLayout } from '@/components/admin/kpis/KpiDetailLayout';
import { SummaryTile, SummaryTilesGrid } from '@/components/admin/kpis/SummaryTile';
import { LineChartCard } from '@/components/admin/kpis/charts/LineChartCard';
import { BarChartCard } from '@/components/admin/kpis/charts/BarChartCard';

export default function KpiChurn() {
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [granularity, setGranularity] = useState<Granularity>('day');
  const { toast } = useToast();

  const { from, to } = getDateRange(dateRange);
  const filters = { dateFrom: from, dateTo: to, granularity };

  const { data: summary, isLoading: loadingSummary, refetch: refetchSummary } = useQuery({
    queryKey: ['kpi-churn-summary', from, to],
    queryFn: () => fetchChurnSummary(filters),
  });

  const { data: timeseries, isLoading: loadingTimeseries, refetch: refetchTimeseries } = useQuery({
    queryKey: ['kpi-churn-timeseries', from, to, granularity],
    queryFn: () => fetchChurnTimeseries(filters),
  });

  const { data: byPlan, isLoading: loadingByPlan, refetch: refetchByPlan } = useQuery({
    queryKey: ['kpi-churn-by-plan', from, to],
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
      exportToCsv(byPlan, 'churn_by_plan');
      toast({ title: 'Export CSV généré' });
    }
  };

  return (
    <KpiDetailLayout
      title="Taux de Churn"
      subtitle="Suivi des annulations et de la rétention"
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
          title="Taux de churn"
          value={`${summary?.churn_rate.toFixed(1) || 0}%`}
          icon={Percent}
          iconColor="text-red-500"
          isLoading={loadingSummary}
        />
        <SummaryTile
          title="Annulations"
          value={summary?.cancellations || 0}
          icon={UserMinus}
          iconColor="text-amber-500"
          isLoading={loadingSummary}
        />
        <SummaryTile
          title="Taux de rétention"
          value={`${summary?.retention_rate.toFixed(1) || 0}%`}
          icon={Shield}
          iconColor="text-green-500"
          isLoading={loadingSummary}
        />
        <SummaryTile
          title="Âge moyen abo."
          value={`${summary?.avg_subscription_age || 0} jours`}
          subtitle="Au moment du churn"
          icon={Clock}
          iconColor="text-blue-500"
          isLoading={loadingSummary}
        />
      </SummaryTilesGrid>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <LineChartCard
          title="Churn dans le temps"
          description="Évolution des annulations"
          data={timeseries || []}
          isLoading={loadingTimeseries}
        />
        <BarChartCard
          title="Churn par plan"
          description="Répartition des annulations par type d'abonnement"
          data={byPlan || []}
          isLoading={loadingByPlan}
        />
      </div>
    </KpiDetailLayout>
  );
}
