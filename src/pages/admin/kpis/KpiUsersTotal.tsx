import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Users, Activity, Crown, UserCheck } from 'lucide-react';
import {
  DateRange,
  Granularity,
  getDateRange,
  fetchUsersSummary,
  fetchUsersTimeseries,
  fetchUsersBreakdown,
  exportToCsv,
} from '@/lib/adminKpis';
import { KpiDetailLayout } from '@/components/admin/kpis/KpiDetailLayout';
import { SummaryTile, SummaryTilesGrid } from '@/components/admin/kpis/SummaryTile';
import { LineChartCard } from '@/components/admin/kpis/charts/LineChartCard';
import { BarChartCard } from '@/components/admin/kpis/charts/BarChartCard';
import { BreakdownTable } from '@/components/admin/kpis/BreakdownTable';

export default function KpiUsersTotal() {
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [granularity, setGranularity] = useState<Granularity>('day');
  const { toast } = useToast();

  const { from, to } = getDateRange(dateRange);
  const filters = { dateFrom: from, dateTo: to, granularity };

  const { data: summary, isLoading: loadingSummary, refetch: refetchSummary } = useQuery({
    queryKey: ['kpi-users-summary', from, to],
    queryFn: () => fetchUsersSummary(filters),
  });

  const { data: timeseries, isLoading: loadingTimeseries, refetch: refetchTimeseries } = useQuery({
    queryKey: ['kpi-users-timeseries', from, to, granularity],
    queryFn: () => fetchUsersTimeseries(filters),
  });

  const { data: breakdown, isLoading: loadingBreakdown, refetch: refetchBreakdown } = useQuery({
    queryKey: ['kpi-users-breakdown', from, to],
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
      exportToCsv(breakdown, 'users_breakdown');
      toast({ title: 'Export CSV généré' });
    }
  };

  return (
    <KpiDetailLayout
      title="Utilisateurs Totaux"
      subtitle="Croissance et composition de la base utilisateurs"
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
          title="Utilisateurs totaux"
          value={summary?.total_users || 0}
          icon={Users}
          iconColor="text-primary"
          isLoading={loadingSummary}
        />
        <SummaryTile
          title="Actifs 7 jours"
          value={summary?.active_users_7d || 0}
          icon={Activity}
          iconColor="text-green-500"
          isLoading={loadingSummary}
        />
        <SummaryTile
          title="Actifs 30 jours"
          value={summary?.active_users_30d || 0}
          icon={Activity}
          iconColor="text-blue-500"
          isLoading={loadingSummary}
        />
        <SummaryTile
          title="En essai"
          value={summary?.trial_users || 0}
          icon={UserCheck}
          iconColor="text-amber-500"
          isLoading={loadingSummary}
        />
        <SummaryTile
          title="Payants"
          value={summary?.paid_users || 0}
          icon={Crown}
          iconColor="text-purple-500"
          isLoading={loadingSummary}
        />
      </SummaryTilesGrid>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <LineChartCard
          title="Croissance utilisateurs"
          description="Nouveaux utilisateurs par période"
          data={timeseries || []}
          isLoading={loadingTimeseries}
        />
        <BarChartCard
          title="Utilisateurs par locale"
          description="Répartition géographique"
          data={breakdown || []}
          isLoading={loadingBreakdown}
        />
      </div>

      {/* Breakdown Table */}
      <BreakdownTable
        title="Répartition par segment"
        description="Détail des utilisateurs par pays/locale"
        data={breakdown || []}
        isLoading={loadingBreakdown}
        exportFilename="users_breakdown"
        columns={[
          { key: 'segment', label: 'Segment', sortable: true },
          { key: 'value', label: 'Utilisateurs', sortable: true, align: 'right' },
          { 
            key: 'percentage', 
            label: '% du total',
            format: (v) => `${(v || 0).toFixed(1)}%`,
            sortable: true,
            align: 'right',
          },
        ]}
      />
    </KpiDetailLayout>
  );
}
