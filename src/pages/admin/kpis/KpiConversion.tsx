import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Percent, UserPlus, ShoppingCart, Clock } from 'lucide-react';
import {
  DateRange,
  Granularity,
  getDateRange,
  fetchConversionFunnel,
  fetchConversionTimeseries,
  exportToCsv,
} from '@/lib/adminKpis';
import { KpiDetailLayout } from '@/components/admin/kpis/KpiDetailLayout';
import { SummaryTile, SummaryTilesGrid } from '@/components/admin/kpis/SummaryTile';
import { LineChartCard } from '@/components/admin/kpis/charts/LineChartCard';
import { FunnelChartCard } from '@/components/admin/kpis/charts/FunnelChartCard';

export default function KpiConversion() {
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [granularity, setGranularity] = useState<Granularity>('day');
  const { toast } = useToast();

  const { from, to } = getDateRange(dateRange);
  const filters = { dateFrom: from, dateTo: to, granularity };

  const { data: funnel, isLoading: loadingFunnel, refetch: refetchFunnel } = useQuery({
    queryKey: ['kpi-conversion-funnel', from, to],
    queryFn: () => fetchConversionFunnel(filters),
  });

  const { data: timeseries, isLoading: loadingTimeseries, refetch: refetchTimeseries } = useQuery({
    queryKey: ['kpi-conversion-timeseries', from, to, granularity],
    queryFn: () => fetchConversionTimeseries(filters),
  });

  const isLoading = loadingFunnel || loadingTimeseries;

  const handleRefresh = () => {
    refetchFunnel();
    refetchTimeseries();
    toast({ title: 'Données actualisées' });
  };

  const handleExport = () => {
    if (funnel) {
      exportToCsv(funnel, 'conversion_funnel');
      toast({ title: 'Export CSV généré' });
    }
  };

  // Calculate overall conversion rate
  const overallRate = funnel && funnel.length >= 2 && funnel[0].count > 0
    ? (funnel[funnel.length - 1].count / funnel[0].count) * 100
    : 0;

  return (
    <KpiDetailLayout
      title="Taux de Conversion"
      subtitle="Funnel Trial → Paid et optimisation"
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
          title="Inscriptions"
          value={funnel?.[0]?.count || 0}
          icon={UserPlus}
          iconColor="text-blue-500"
          isLoading={loadingFunnel}
        />
        <SummaryTile
          title="Conversions payantes"
          value={funnel?.[funnel.length - 1]?.count || 0}
          icon={ShoppingCart}
          iconColor="text-green-500"
          isLoading={loadingFunnel}
        />
        <SummaryTile
          title="Taux global"
          value={`${overallRate.toFixed(1)}%`}
          icon={Percent}
          iconColor="text-purple-500"
          isLoading={loadingFunnel}
        />
        <SummaryTile
          title="Temps médian"
          value="~7 jours"
          subtitle="Trial → Paid"
          icon={Clock}
          iconColor="text-amber-500"
          isLoading={loadingFunnel}
        />
      </SummaryTilesGrid>

      {/* Funnel Chart */}
      <div className="mb-8">
        <FunnelChartCard
          title="Funnel de conversion"
          description="Parcours utilisateur de l'inscription à l'achat"
          data={funnel || []}
          isLoading={loadingFunnel}
        />
      </div>

      {/* Timeseries */}
      <LineChartCard
        title="Conversions dans le temps"
        description="Nombre de conversions payantes par période"
        data={timeseries || []}
        isLoading={loadingTimeseries}
      />
    </KpiDetailLayout>
  );
}
