import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Star, BarChart3, ThumbsUp, Hash } from 'lucide-react';
import {
  DateRange,
  Granularity,
  getDateRange,
  fetchRatingsSummary,
  fetchRatingsTimeseries,
  fetchRatingsDistribution,
  exportToCsv,
} from '@/lib/adminKpis';
import { KpiDetailLayout } from '@/components/admin/kpis/KpiDetailLayout';
import { SummaryTile, SummaryTilesGrid } from '@/components/admin/kpis/SummaryTile';
import { LineChartCard } from '@/components/admin/kpis/charts/LineChartCard';
import { BarChartCard } from '@/components/admin/kpis/charts/BarChartCard';

export default function KpiRatings() {
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [granularity, setGranularity] = useState<Granularity>('day');
  const { toast } = useToast();

  const { from, to } = getDateRange(dateRange);
  const filters = { dateFrom: from, dateTo: to, granularity };

  const { data: summary, isLoading: loadingSummary, refetch: refetchSummary } = useQuery({
    queryKey: ['kpi-ratings-summary', from, to],
    queryFn: () => fetchRatingsSummary(filters),
  });

  const { data: timeseries, isLoading: loadingTimeseries, refetch: refetchTimeseries } = useQuery({
    queryKey: ['kpi-ratings-timeseries', from, to, granularity],
    queryFn: () => fetchRatingsTimeseries(filters),
  });

  const { data: distribution, isLoading: loadingDistribution, refetch: refetchDistribution } = useQuery({
    queryKey: ['kpi-ratings-distribution', from, to],
    queryFn: () => fetchRatingsDistribution(filters),
  });

  const isLoading = loadingSummary || loadingTimeseries || loadingDistribution;

  const handleRefresh = () => {
    refetchSummary();
    refetchTimeseries();
    refetchDistribution();
    toast({ title: 'Données actualisées' });
  };

  const handleExport = () => {
    if (distribution) {
      exportToCsv(distribution, 'ratings_distribution');
      toast({ title: 'Export CSV généré' });
    }
  };

  return (
    <KpiDetailLayout
      title="Notes & Évaluations"
      subtitle="Satisfaction utilisateur et qualité des recettes"
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
          title="Note moyenne"
          value={`${(summary?.avg_rating || 0).toFixed(1)} ⭐`}
          icon={Star}
          iconColor="text-yellow-500"
          isLoading={loadingSummary}
        />
        <SummaryTile
          title="Nombre de notes"
          value={summary?.ratings_count || 0}
          icon={Hash}
          iconColor="text-blue-500"
          isLoading={loadingSummary}
        />
        <SummaryTile
          title="% 4-5 étoiles"
          value={`${(summary?.pct_4_5_stars || 0).toFixed(1)}%`}
          subtitle="Notes positives"
          icon={ThumbsUp}
          iconColor="text-green-500"
          isLoading={loadingSummary}
        />
      </SummaryTilesGrid>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <LineChartCard
          title="Note moyenne dans le temps"
          description="Évolution de la satisfaction"
          data={timeseries || []}
          isLoading={loadingTimeseries}
          formatValue={(v) => v.toFixed(1)}
        />
        <BarChartCard
          title="Distribution des notes"
          description="Répartition de 1 à 5 étoiles"
          data={distribution || []}
          isLoading={loadingDistribution}
        />
      </div>
    </KpiDetailLayout>
  );
}
