import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Euro, TrendingUp, TrendingDown, PlusCircle, MinusCircle } from 'lucide-react';
import {
  DateRange,
  Granularity,
  getDateRange,
  fetchMrrSummary,
  fetchMrrTimeseries,
  fetchMrrByPlan,
  fetchMrrTopCustomers,
  exportToCsv,
} from '@/lib/adminKpis';
import { KpiDetailLayout } from '@/components/admin/kpis/KpiDetailLayout';
import { SummaryTile, SummaryTilesGrid } from '@/components/admin/kpis/SummaryTile';
import { LineChartCard } from '@/components/admin/kpis/charts/LineChartCard';
import { PieChartCard } from '@/components/admin/kpis/charts/PieChartCard';
import { BreakdownTable } from '@/components/admin/kpis/BreakdownTable';

export default function KpiMrr() {
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [granularity, setGranularity] = useState<Granularity>('day');
  const { toast } = useToast();

  const { from, to } = getDateRange(dateRange);
  const filters = { dateFrom: from, dateTo: to, granularity };

  const { data: summary, isLoading: loadingSummary, refetch: refetchSummary } = useQuery({
    queryKey: ['kpi-mrr-summary', from, to],
    queryFn: () => fetchMrrSummary(filters),
  });

  const { data: timeseries, isLoading: loadingTimeseries, refetch: refetchTimeseries } = useQuery({
    queryKey: ['kpi-mrr-timeseries', from, to, granularity],
    queryFn: () => fetchMrrTimeseries(filters),
  });

  const { data: byPlan, isLoading: loadingByPlan, refetch: refetchByPlan } = useQuery({
    queryKey: ['kpi-mrr-by-plan', from, to],
    queryFn: () => fetchMrrByPlan(filters),
  });

  const { data: topCustomers, isLoading: loadingTopCustomers, refetch: refetchTopCustomers } = useQuery({
    queryKey: ['kpi-mrr-top-customers', from, to],
    queryFn: () => fetchMrrTopCustomers(filters),
  });

  const isLoading = loadingSummary || loadingTimeseries || loadingByPlan || loadingTopCustomers;

  const handleRefresh = () => {
    refetchSummary();
    refetchTimeseries();
    refetchByPlan();
    refetchTopCustomers();
    toast({ title: 'Données actualisées' });
  };

  const handleExport = () => {
    if (byPlan) {
      exportToCsv(byPlan, 'mrr_by_plan');
      toast({ title: 'Export CSV généré' });
    }
  };

  const change = summary ? ((summary.current_mrr - summary.previous_mrr) / (summary.previous_mrr || 1)) * 100 : 0;

  return (
    <KpiDetailLayout
      title="MRR — Revenue Mensuel Récurrent"
      subtitle="Évolution et composition du revenue récurrent"
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
          title="MRR actuel"
          value={`${summary?.current_mrr.toFixed(2) || 0}€`}
          icon={Euro}
          iconColor="text-green-500"
          trend={{ value: change }}
          isLoading={loadingSummary}
        />
        <SummaryTile
          title="MRR période précédente"
          value={`${summary?.previous_mrr.toFixed(2) || 0}€`}
          icon={Euro}
          iconColor="text-muted-foreground"
          isLoading={loadingSummary}
        />
        <SummaryTile
          title="Variation nette"
          value={`${summary?.net_change.toFixed(2) || 0}€`}
          icon={summary?.net_change && summary.net_change >= 0 ? TrendingUp : TrendingDown}
          iconColor={summary?.net_change && summary.net_change >= 0 ? 'text-green-500' : 'text-red-500'}
          isLoading={loadingSummary}
        />
        <SummaryTile
          title="Nouveau MRR"
          value={`${summary?.new_mrr.toFixed(2) || 0}€`}
          icon={PlusCircle}
          iconColor="text-blue-500"
          isLoading={loadingSummary}
        />
        <SummaryTile
          title="MRR perdu (churn)"
          value={`${summary?.churned.toFixed(2) || 0}€`}
          icon={MinusCircle}
          iconColor="text-red-500"
          isLoading={loadingSummary}
        />
      </SummaryTilesGrid>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <LineChartCard
          title="MRR dans le temps"
          description="Évolution du revenue récurrent"
          data={timeseries || []}
          isLoading={loadingTimeseries}
          formatValue={(v) => `${v.toFixed(0)}€`}
        />
        <PieChartCard
          title="MRR par plan"
          description="Répartition du revenue par type d'abonnement"
          data={byPlan || []}
          isLoading={loadingByPlan}
          formatValue={(v) => `${v.toFixed(2)}€`}
        />
      </div>

      {/* Top Customers Table */}
      <BreakdownTable
        title="Top clients par MRR"
        description="Clients générant le plus de revenue récurrent"
        data={topCustomers?.data || []}
        isLoading={loadingTopCustomers}
        exportFilename="mrr_top_customers"
        columns={[
          { key: 'email', label: 'Email', sortable: true },
          { key: 'name', label: 'Nom' },
          { key: 'plan', label: 'Plan' },
          { 
            key: 'mrr', 
            label: 'MRR', 
            format: (v) => `${v.toFixed(2)}€`,
            sortable: true,
            align: 'right',
          },
          { 
            key: 'created_at', 
            label: 'Inscrit le',
            format: (v) => new Date(v).toLocaleDateString('fr-FR'),
          },
        ]}
        hasMore={!!topCustomers?.nextCursor}
      />
    </KpiDetailLayout>
  );
}
