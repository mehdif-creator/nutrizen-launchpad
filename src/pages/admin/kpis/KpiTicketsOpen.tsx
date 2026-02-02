import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Ticket, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import {
  DateRange,
  Granularity,
  getDateRange,
  fetchTicketsSummary,
  fetchTicketsTimeseries,
  fetchTicketsByCategory,
  fetchTicketList,
  exportToCsv,
} from '@/lib/adminKpis';
import { KpiDetailLayout } from '@/components/admin/kpis/KpiDetailLayout';
import { SummaryTile, SummaryTilesGrid } from '@/components/admin/kpis/SummaryTile';
import { LineChartCard } from '@/components/admin/kpis/charts/LineChartCard';
import { BarChartCard } from '@/components/admin/kpis/charts/BarChartCard';
import { BreakdownTable } from '@/components/admin/kpis/BreakdownTable';
import { Badge } from '@/components/ui/badge';

export default function KpiTicketsOpen() {
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [granularity, setGranularity] = useState<Granularity>('day');
  const { toast } = useToast();

  const { from, to } = getDateRange(dateRange);
  const filters = { dateFrom: from, dateTo: to, granularity };

  const { data: summary, isLoading: loadingSummary, refetch: refetchSummary } = useQuery({
    queryKey: ['kpi-tickets-summary', from, to],
    queryFn: () => fetchTicketsSummary(filters),
  });

  const { data: timeseries, isLoading: loadingTimeseries, refetch: refetchTimeseries } = useQuery({
    queryKey: ['kpi-tickets-timeseries', from, to, granularity],
    queryFn: () => fetchTicketsTimeseries(filters),
  });

  const { data: byCategory, isLoading: loadingByCategory, refetch: refetchByCategory } = useQuery({
    queryKey: ['kpi-tickets-by-category', from, to],
    queryFn: () => fetchTicketsByCategory(filters),
  });

  const { data: ticketList, isLoading: loadingList, refetch: refetchList } = useQuery({
    queryKey: ['kpi-tickets-list', from, to],
    queryFn: () => fetchTicketList(filters, undefined, 20, 'open'),
  });

  const isLoading = loadingSummary || loadingTimeseries || loadingByCategory || loadingList;

  const handleRefresh = () => {
    refetchSummary();
    refetchTimeseries();
    refetchByCategory();
    refetchList();
    toast({ title: 'Données actualisées' });
  };

  const handleExport = () => {
    if (ticketList?.data) {
      exportToCsv(ticketList.data, 'open_tickets');
      toast({ title: 'Export CSV généré' });
    }
  };

  return (
    <KpiDetailLayout
      title="Tickets Support Ouverts"
      subtitle="Suivi du backlog et performances support"
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
          title="Tickets ouverts"
          value={summary?.open_tickets || 0}
          icon={Ticket}
          iconColor="text-orange-500"
          isLoading={loadingSummary}
        />
        <SummaryTile
          title="Temps 1ère réponse"
          value={`${summary?.avg_first_response_time.toFixed(1) || 0}h`}
          icon={Clock}
          iconColor="text-blue-500"
          isLoading={loadingSummary}
        />
        <SummaryTile
          title="Temps résolution"
          value={`${summary?.avg_resolution_time.toFixed(0) || 0}h`}
          icon={CheckCircle}
          iconColor="text-green-500"
          isLoading={loadingSummary}
        />
        <SummaryTile
          title="Dépassements SLA"
          value={summary?.sla_breach_count || 0}
          icon={AlertTriangle}
          iconColor="text-red-500"
          isLoading={loadingSummary}
        />
      </SummaryTilesGrid>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <LineChartCard
          title="Tickets dans le temps"
          description="Volume de tickets créés par période"
          data={timeseries || []}
          isLoading={loadingTimeseries}
        />
        <BarChartCard
          title="Tickets par catégorie"
          description="Répartition par type de demande"
          data={byCategory || []}
          isLoading={loadingByCategory}
        />
      </div>

      {/* Tickets List */}
      <BreakdownTable
        title="Tickets ouverts"
        description="Liste des tickets en attente de traitement"
        data={ticketList?.data || []}
        isLoading={loadingList}
        exportFilename="open_tickets"
        columns={[
          { key: 'subject', label: 'Sujet', sortable: true },
          { 
            key: 'status', 
            label: 'Statut',
            format: (v) => (
              <Badge variant={v === 'open' ? 'destructive' : 'secondary'}>
                {v}
              </Badge>
            ),
          },
          { key: 'priority', label: 'Priorité' },
          { key: 'category', label: 'Catégorie' },
          { 
            key: 'created_at', 
            label: 'Créé le',
            format: (v) => new Date(v).toLocaleDateString('fr-FR'),
            sortable: true,
          },
        ]}
        hasMore={!!ticketList?.nextCursor}
      />
    </KpiDetailLayout>
  );
}
