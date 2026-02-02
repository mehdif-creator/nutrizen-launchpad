import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Calendar, CalendarDays, Users, Activity } from 'lucide-react';
import {
  DateRange,
  Granularity,
  getDateRange,
  fetchMenusSummary,
  fetchMenusTimeseries,
  fetchTopMenuCreators,
  exportToCsv,
} from '@/lib/adminKpis';
import { KpiDetailLayout } from '@/components/admin/kpis/KpiDetailLayout';
import { SummaryTile, SummaryTilesGrid } from '@/components/admin/kpis/SummaryTile';
import { LineChartCard } from '@/components/admin/kpis/charts/LineChartCard';
import { BreakdownTable } from '@/components/admin/kpis/BreakdownTable';

export default function KpiMenusCreated() {
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [granularity, setGranularity] = useState<Granularity>('day');
  const { toast } = useToast();

  const { from, to } = getDateRange(dateRange);
  const filters = { dateFrom: from, dateTo: to, granularity };

  const { data: summary, isLoading: loadingSummary, refetch: refetchSummary } = useQuery({
    queryKey: ['kpi-menus-summary', from, to],
    queryFn: () => fetchMenusSummary(filters),
  });

  const { data: timeseries, isLoading: loadingTimeseries, refetch: refetchTimeseries } = useQuery({
    queryKey: ['kpi-menus-timeseries', from, to, granularity],
    queryFn: () => fetchMenusTimeseries(filters),
  });

  const { data: topCreators, isLoading: loadingTopCreators, refetch: refetchTopCreators } = useQuery({
    queryKey: ['kpi-menus-top-creators', from, to],
    queryFn: () => fetchTopMenuCreators(filters),
  });

  const isLoading = loadingSummary || loadingTimeseries || loadingTopCreators;

  const handleRefresh = () => {
    refetchSummary();
    refetchTimeseries();
    refetchTopCreators();
    toast({ title: 'Données actualisées' });
  };

  const handleExport = () => {
    if (topCreators?.data) {
      exportToCsv(topCreators.data, 'top_menu_creators');
      toast({ title: 'Export CSV généré' });
    }
  };

  return (
    <KpiDetailLayout
      title="Menus Créés"
      subtitle="Métrique d'usage principale du produit"
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
          title="Menus créés"
          value={summary?.menus_created || 0}
          subtitle="Sur la période"
          icon={Calendar}
          iconColor="text-green-500"
          isLoading={loadingSummary}
        />
        <SummaryTile
          title="Aujourd'hui"
          value={summary?.menus_today || 0}
          icon={CalendarDays}
          iconColor="text-blue-500"
          isLoading={loadingSummary}
        />
        <SummaryTile
          title="Cette semaine"
          value={summary?.menus_week || 0}
          icon={CalendarDays}
          iconColor="text-purple-500"
          isLoading={loadingSummary}
        />
        <SummaryTile
          title="Utilisateurs actifs"
          value={summary?.users_with_menus || 0}
          subtitle="Ayant créé des menus"
          icon={Users}
          iconColor="text-amber-500"
          isLoading={loadingSummary}
        />
        <SummaryTile
          title="Moyenne/user"
          value={(summary?.avg_menus_per_user || 0).toFixed(1)}
          icon={Activity}
          iconColor="text-primary"
          isLoading={loadingSummary}
        />
      </SummaryTilesGrid>

      {/* Chart */}
      <div className="mb-8">
        <LineChartCard
          title="Menus créés dans le temps"
          description="Évolution de la création de menus"
          data={timeseries || []}
          isLoading={loadingTimeseries}
        />
      </div>

      {/* Top Creators */}
      <BreakdownTable
        title="Top créateurs de menus"
        description="Utilisateurs les plus actifs"
        data={topCreators?.data || []}
        isLoading={loadingTopCreators}
        exportFilename="top_menu_creators"
        columns={[
          { key: 'email', label: 'Email', sortable: true },
          { key: 'menu_count', label: 'Menus créés', sortable: true, align: 'right' },
        ]}
      />
    </KpiDetailLayout>
  );
}
