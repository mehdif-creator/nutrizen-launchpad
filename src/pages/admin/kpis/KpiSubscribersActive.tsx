import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Crown, UserPlus, UserMinus, PieChart } from 'lucide-react';
import {
  DateRange,
  Granularity,
  getDateRange,
  fetchSubscribersSummary,
  fetchSubscribersTimeseries,
  exportToCsv,
} from '@/lib/adminKpis';
import { KpiDetailLayout } from '@/components/admin/kpis/KpiDetailLayout';
import { SummaryTile, SummaryTilesGrid } from '@/components/admin/kpis/SummaryTile';
import { LineChartCard } from '@/components/admin/kpis/charts/LineChartCard';
import { PieChartCard } from '@/components/admin/kpis/charts/PieChartCard';

export default function KpiSubscribersActive() {
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [granularity, setGranularity] = useState<Granularity>('day');
  const { toast } = useToast();

  const { from, to } = getDateRange(dateRange);
  const filters = { dateFrom: from, dateTo: to, granularity };

  const { data: summary, isLoading: loadingSummary, refetch: refetchSummary } = useQuery({
    queryKey: ['kpi-subscribers-summary', from, to],
    queryFn: () => fetchSubscribersSummary(filters),
  });

  const { data: timeseries, isLoading: loadingTimeseries, refetch: refetchTimeseries } = useQuery({
    queryKey: ['kpi-subscribers-timeseries', from, to, granularity],
    queryFn: () => fetchSubscribersTimeseries(filters),
  });

  const isLoading = loadingSummary || loadingTimeseries;

  const handleRefresh = () => {
    refetchSummary();
    refetchTimeseries();
    toast({ title: 'Données actualisées' });
  };

  const handleExport = () => {
    if (summary?.plan_distribution) {
      exportToCsv(summary.plan_distribution, 'subscribers_by_plan');
      toast({ title: 'Export CSV généré' });
    }
  };

  return (
    <KpiDetailLayout
      title="Abonnés Actifs"
      subtitle="Suivi des abonnements et répartition par plan"
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
          title="Abonnés actifs"
          value={summary?.active_subscribers || 0}
          icon={Crown}
          iconColor="text-primary"
          isLoading={loadingSummary}
        />
        <SummaryTile
          title="Nouveaux abonnés"
          value={summary?.new_subscribers || 0}
          subtitle="Cette période"
          icon={UserPlus}
          iconColor="text-green-500"
          isLoading={loadingSummary}
        />
        <SummaryTile
          title="Annulés"
          value={summary?.cancelled_subscribers || 0}
          icon={UserMinus}
          iconColor="text-red-500"
          isLoading={loadingSummary}
        />
        <SummaryTile
          title="Plans différents"
          value={summary?.plan_distribution?.length || 0}
          icon={PieChart}
          iconColor="text-blue-500"
          isLoading={loadingSummary}
        />
      </SummaryTilesGrid>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <LineChartCard
          title="Abonnés dans le temps"
          description="Évolution du nombre d'abonnés"
          data={timeseries || []}
          isLoading={loadingTimeseries}
        />
        <PieChartCard
          title="Distribution par plan"
          description="Répartition des abonnés par type de plan"
          data={summary?.plan_distribution || []}
          isLoading={loadingSummary}
        />
      </div>
    </KpiDetailLayout>
  );
}
