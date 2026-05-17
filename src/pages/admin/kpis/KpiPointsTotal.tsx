import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Star, Trophy, Users, Sparkles } from 'lucide-react';
import {
  DateRange,
  Granularity,
  getDateRange,
  fetchPointsSummary,
  fetchPointsTimeseries,
  fetchPointsByEventType,
  fetchPointsLeaderboard,
  exportToCsv,
} from '@/lib/adminKpis';
import { KpiDetailLayout } from '@/components/admin/kpis/KpiDetailLayout';
import { SummaryTile, SummaryTilesGrid } from '@/components/admin/kpis/SummaryTile';
import { LineChartCard } from '@/components/admin/kpis/charts/LineChartCard';
import { BarChartCard } from '@/components/admin/kpis/charts/BarChartCard';
import { BreakdownTable } from '@/components/admin/kpis/BreakdownTable';
import { Badge } from '@/components/ui/badge';

export default function KpiPointsTotal() {
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [granularity, setGranularity] = useState<Granularity>('day');
  const { toast } = useToast();

  const { from, to } = getDateRange(dateRange);
  const filters = { dateFrom: from, dateTo: to, granularity };

  const {
    data: summary,
    isLoading: loadingSummary,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: ['kpi-points-summary', from, to],
    queryFn: () => fetchPointsSummary(filters),
  });

  const {
    data: timeseries,
    isLoading: loadingTimeseries,
    refetch: refetchTimeseries,
  } = useQuery({
    queryKey: ['kpi-points-timeseries', from, to, granularity],
    queryFn: () => fetchPointsTimeseries(filters),
  });

  const {
    data: byEventType,
    isLoading: loadingByEventType,
    refetch: refetchByEventType,
  } = useQuery({
    queryKey: ['kpi-points-by-event', from, to],
    queryFn: () => fetchPointsByEventType(filters),
  });

  const {
    data: leaderboard,
    isLoading: loadingLeaderboard,
    refetch: refetchLeaderboard,
  } = useQuery({
    queryKey: ['kpi-points-leaderboard', from, to],
    queryFn: () => fetchPointsLeaderboard(filters),
  });

  const isLoading = loadingSummary || loadingTimeseries || loadingByEventType || loadingLeaderboard;

  const handleRefresh = () => {
    refetchSummary();
    refetchTimeseries();
    refetchByEventType();
    refetchLeaderboard();
    toast({ title: 'Données actualisées' });
  };

  const handleExport = () => {
    if (leaderboard?.data) {
      exportToCsv(leaderboard.data, 'points_leaderboard');
      toast({ title: 'Export CSV généré' });
    }
  };

  return (
    <KpiDetailLayout
      title="Points Gamification"
      subtitle="Impact du système de points sur l'engagement"
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
          title="Points totaux"
          value={summary?.total_points.toLocaleString() || 0}
          icon={Star}
          iconColor="text-amber-500"
          isLoading={loadingSummary}
        />
        <SummaryTile
          title="Points/utilisateur"
          value={(summary?.points_per_user || 0).toFixed(0)}
          subtitle="Moyenne"
          icon={Users}
          iconColor="text-blue-500"
          isLoading={loadingSummary}
        />
        <SummaryTile
          title="Top earners"
          value={summary?.top_earners_count || 0}
          subtitle="Utilisateurs très actifs"
          icon={Trophy}
          iconColor="text-purple-500"
          isLoading={loadingSummary}
        />
      </SummaryTilesGrid>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <LineChartCard
          title="Points gagnés dans le temps"
          description="Évolution de l'engagement gamifié"
          data={timeseries || []}
          isLoading={loadingTimeseries}
        />
        <BarChartCard
          title="Points par type d'événement"
          description="Sources de points les plus fréquentes"
          data={byEventType || []}
          isLoading={loadingByEventType}
          horizontal
        />
      </div>

      {/* Leaderboard */}
      <BreakdownTable
        title="Classement des utilisateurs"
        description="Top utilisateurs par points gagnés"
        data={leaderboard?.data || []}
        isLoading={loadingLeaderboard}
        exportFilename="points_leaderboard"
        columns={[
          {
            key: 'rank',
            label: '#',
            format: (v) => (
              <Badge variant={v <= 3 ? 'default' : 'secondary'}>
                {v === 1 ? '🥇' : v === 2 ? '🥈' : v === 3 ? '🥉' : v}
              </Badge>
            ),
          },
          { key: 'email', label: 'Email', sortable: true },
          { key: 'name', label: 'Nom' },
          { key: 'total_points', label: 'Points', sortable: true, align: 'right' },
        ]}
        hasMore={!!leaderboard?.nextCursor}
      />
    </KpiDetailLayout>
  );
}
