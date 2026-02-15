/**
 * Admin KPI Data Layer
 * All admin data queries now go through the admin-analytics Edge Function
 * to prevent client-side data exposure. No direct database queries.
 * 
 * ARCHITECTURE:
 * - All data access proxied through server-side Edge Function
 * - Admin auth validated server-side before any query execution
 * - In-flight request deduplication + TTL cache on frontend
 * - Edge Function runs queries with service_role, returns aggregated data only
 */

import { supabase } from '@/integrations/supabase/client';

// ============= Types =============

export type DateRange = '7d' | '30d' | '90d' | '12m' | 'custom';
export type Granularity = 'day' | 'week' | 'month';

export type KpiSlug = 
  | 'mrr' 
  | 'arpu' 
  | 'conversion' 
  | 'churn'
  | 'users-total' 
  | 'subscribers-active' 
  | 'new-users' 
  | 'tickets-open'
  | 'menus-created' 
  | 'menus-per-user' 
  | 'ratings' 
  | 'points-total';

export interface KpiFilters {
  dateFrom: string;
  dateTo: string;
  granularity?: Granularity;
  plan?: string;
  country?: string;
  device?: string;
}

export interface TimeSeriesPoint {
  date: string;
  value: number;
}

export interface BreakdownRow {
  segment: string;
  value: number;
  percentage?: number;
  count?: number;
}

export interface ConversionFunnelStep {
  step: string;
  count: number;
  conversion_rate?: number;
}

export interface KpiCardSummary {
  headline: number | string;
  delta?: number;
  deltaLabel?: string;
  subtitle?: string;
  sparkline?: TimeSeriesPoint[];
}

export interface KpiDetailsResult {
  summary: KpiCardSummary;
  series: TimeSeriesPoint[];
  breakdown: BreakdownRow[];
  nextCursor?: string;
}

// ============= KPI Registry =============

export interface KpiConfig {
  slug: KpiSlug;
  title: string;
  subtitle: string;
  category: 'financial' | 'users' | 'engagement';
  defaultDateRange: DateRange;
  allowedGranularities: Granularity[];
  cardRpc?: string;
  seriesRpc?: string;
  breakdownRpc?: string;
  formatValue?: (v: number) => string;
}

export const KPI_REGISTRY: Record<KpiSlug, KpiConfig> = {
  'mrr': {
    slug: 'mrr',
    title: 'MRR',
    subtitle: 'Revenue mensuel récurrent',
    category: 'financial',
    defaultDateRange: '30d',
    allowedGranularities: ['day', 'week', 'month'],
    cardRpc: 'get_kpi_mrr_card',
    seriesRpc: 'get_kpi_mrr_timeseries',
    breakdownRpc: 'get_kpi_mrr_by_plan',
    formatValue: (v) => `${v.toFixed(2)}€`,
  },
  'arpu': {
    slug: 'arpu',
    title: 'ARPU',
    subtitle: 'Revenue moyen par utilisateur',
    category: 'financial',
    defaultDateRange: '30d',
    allowedGranularities: ['day', 'week', 'month'],
    cardRpc: 'get_kpi_arpu_card',
    seriesRpc: 'get_kpi_arpu_timeseries',
    formatValue: (v) => `${v.toFixed(2)}€`,
  },
  'conversion': {
    slug: 'conversion',
    title: 'Taux de conversion',
    subtitle: 'Trial → Paid',
    category: 'financial',
    defaultDateRange: '30d',
    allowedGranularities: ['day', 'week', 'month'],
    cardRpc: 'get_kpi_conversion_card',
    seriesRpc: 'get_kpi_conversion_timeseries',
    breakdownRpc: 'get_kpi_conversion_breakdown',
    formatValue: (v) => `${v.toFixed(1)}%`,
  },
  'churn': {
    slug: 'churn',
    title: 'Taux de churn',
    subtitle: 'Annulations',
    category: 'financial',
    defaultDateRange: '30d',
    allowedGranularities: ['day', 'week', 'month'],
    cardRpc: 'get_kpi_churn_card',
    seriesRpc: 'get_kpi_churn_timeseries',
    breakdownRpc: 'get_kpi_churn_by_plan',
    formatValue: (v) => `${v.toFixed(1)}%`,
  },
  'users-total': {
    slug: 'users-total',
    title: 'Utilisateurs totaux',
    subtitle: 'Base utilisateurs',
    category: 'users',
    defaultDateRange: '30d',
    allowedGranularities: ['day', 'week', 'month'],
    cardRpc: 'get_kpi_users_card',
    seriesRpc: 'get_kpi_users_growth_timeseries',
    breakdownRpc: 'get_kpi_users_breakdown',
  },
  'subscribers-active': {
    slug: 'subscribers-active',
    title: 'Abonnés actifs',
    subtitle: 'Payants',
    category: 'users',
    defaultDateRange: '30d',
    allowedGranularities: ['day', 'week', 'month'],
    cardRpc: 'get_kpi_subscribers_card',
    seriesRpc: 'get_kpi_subscribers_timeseries',
    breakdownRpc: 'get_kpi_subscribers_breakdown',
  },
  'new-users': {
    slug: 'new-users',
    title: 'Nouveaux utilisateurs',
    subtitle: 'Ce mois',
    category: 'users',
    defaultDateRange: '30d',
    allowedGranularities: ['day', 'week', 'month'],
    cardRpc: 'get_kpi_new_users_card',
    seriesRpc: 'get_kpi_new_users_timeseries',
    breakdownRpc: 'get_kpi_new_users_by_channel',
  },
  'tickets-open': {
    slug: 'tickets-open',
    title: 'Tickets ouverts',
    subtitle: 'Support en attente',
    category: 'users',
    defaultDateRange: '30d',
    allowedGranularities: ['day', 'week', 'month'],
    cardRpc: 'get_kpi_tickets_card',
    seriesRpc: 'get_kpi_tickets_timeseries',
    breakdownRpc: 'get_kpi_tickets_by_category',
  },
  'menus-created': {
    slug: 'menus-created',
    title: 'Menus créés',
    subtitle: 'Total',
    category: 'engagement',
    defaultDateRange: '30d',
    allowedGranularities: ['day', 'week', 'month'],
    cardRpc: 'get_kpi_menus_card',
    seriesRpc: 'get_kpi_menus_created_timeseries',
    breakdownRpc: 'get_kpi_menus_breakdown',
  },
  'menus-per-user': {
    slug: 'menus-per-user',
    title: 'Menus/utilisateur',
    subtitle: 'Moyenne',
    category: 'engagement',
    defaultDateRange: '30d',
    allowedGranularities: ['day', 'week', 'month'],
    cardRpc: 'get_kpi_menus_per_user_card',
    seriesRpc: 'get_kpi_menus_per_user_timeseries',
    breakdownRpc: 'get_kpi_menus_per_user_distribution',
    formatValue: (v) => v.toFixed(1),
  },
  'ratings': {
    slug: 'ratings',
    title: 'Notations',
    subtitle: 'Évaluations',
    category: 'engagement',
    defaultDateRange: '30d',
    allowedGranularities: ['day', 'week', 'month'],
    cardRpc: 'get_kpi_ratings_card',
    seriesRpc: 'get_kpi_ratings_timeseries',
    breakdownRpc: 'get_kpi_ratings_distribution',
  },
  'points-total': {
    slug: 'points-total',
    title: 'Points totaux',
    subtitle: 'Gamification',
    category: 'engagement',
    defaultDateRange: '30d',
    allowedGranularities: ['day', 'week', 'month'],
    cardRpc: 'get_kpi_points_card',
    seriesRpc: 'get_kpi_points_timeseries',
    breakdownRpc: 'get_kpi_points_by_event_type',
  },
};

// ============= Caching & Deduplication =============

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<any>>();
const inFlightRequests = new Map<string, Promise<any>>();
const CACHE_TTL_MS = 30000; // 30 seconds

function getCacheKey(fn: string, ...args: any[]): string {
  return `${fn}:${JSON.stringify(args)}`;
}

function getFromCache<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

async function dedupedRequest<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const cached = getFromCache<T>(key);
  if (cached !== null) return cached;

  const inFlight = inFlightRequests.get(key);
  if (inFlight) return inFlight;

  const promise = fn()
    .then((result) => {
      setCache(key, result);
      inFlightRequests.delete(key);
      return result;
    })
    .catch((error) => {
      inFlightRequests.delete(key);
      throw error;
    });

  inFlightRequests.set(key, promise);
  return promise;
}

export function clearKpiCache(): void {
  cache.clear();
}

// ============= Admin Check (client-side, for UI gating only) =============

export class AdminAccessError extends Error {
  constructor() {
    super('Access denied: Admin privileges required');
    this.name = 'AdminAccessError';
  }
}

export async function assertAdminOrThrow(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new AdminAccessError();

  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .maybeSingle();

  if (error || !data) {
    throw new AdminAccessError();
  }
}

export async function isAdmin(): Promise<boolean> {
  try {
    await assertAdminOrThrow();
    return true;
  } catch {
    return false;
  }
}

// ============= Server-Side API Proxy =============

/**
 * Call the admin-analytics Edge Function.
 * All admin data queries go through this single entry point.
 * Admin auth is validated server-side.
 */
async function callAdminApi<T>(action: string, filters: Partial<KpiFilters> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke('admin-analytics', {
    body: { action, filters },
  });

  if (error) {
    console.error(`[adminKpis] Edge function error for ${action}:`, error.message);
    throw new Error(`Admin analytics error: ${error.message}`);
  }

  if (data?.error) {
    throw new Error(data.error.message || 'Admin analytics error');
  }

  return data?.data as T;
}

// ============= Helper Functions =============

export function getDateRange(range: DateRange, customFrom?: string, customTo?: string): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString().split('T')[0];
  
  switch (range) {
    case '7d':
      return { from: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], to };
    case '30d':
      return { from: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], to };
    case '90d':
      return { from: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], to };
    case '12m':
      return { from: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], to };
    case 'custom':
      return { from: customFrom || to, to: customTo || to };
    default:
      return { from: to, to };
  }
}

export function getPreviousPeriodRange(from: string, to: string): { from: string; to: string } {
  const fromDate = new Date(from);
  const toDate = new Date(to);
  const periodMs = toDate.getTime() - fromDate.getTime();
  return {
    from: new Date(fromDate.getTime() - periodMs).toISOString().split('T')[0],
    to: new Date(fromDate.getTime() - 1).toISOString().split('T')[0],
  };
}

// ============= CSV Export =============

export function exportToCsv(data: any[], filename: string): void {
  if (!data || data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(h => JSON.stringify(row[h] ?? '')).join(',')),
  ].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
}

// ============= Unified KPI Fetchers =============

const CARD_ACTION_MAP: Record<KpiSlug, string> = {
  'mrr': 'mrr_card',
  'arpu': 'arpu_card',
  'conversion': 'conversion_card',
  'churn': 'churn_card',
  'users-total': 'users_card',
  'subscribers-active': 'subscribers_card',
  'new-users': 'new_users_card',
  'tickets-open': 'tickets_card',
  'menus-created': 'menus_card',
  'menus-per-user': 'menus_per_user_card',
  'ratings': 'ratings_card',
  'points-total': 'points_card',
};

export async function fetchKpiCardSummary(
  slug: KpiSlug, 
  range: DateRange = '30d'
): Promise<KpiCardSummary> {
  const { from, to } = getDateRange(range);
  const cacheKey = getCacheKey('card', slug, from, to);
  const action = CARD_ACTION_MAP[slug];
  if (!action) return { headline: 0, subtitle: 'Unknown KPI' };

  return dedupedRequest(cacheKey, () => 
    callAdminApi<KpiCardSummary>(action, { dateFrom: from, dateTo: to })
  );
}

export async function prefetchAllCardSummaries(
  range: DateRange = '30d'
): Promise<Record<KpiSlug, KpiCardSummary>> {
  const slugs = Object.keys(KPI_REGISTRY) as KpiSlug[];
  const results = await Promise.all(
    slugs.map(async (slug) => {
      try {
        const summary = await fetchKpiCardSummary(slug, range);
        return [slug, summary] as const;
      } catch (error) {
        console.error(`Error fetching ${slug}:`, error);
        return [slug, { headline: 0, subtitle: 'Error' }] as const;
      }
    })
  );
  return Object.fromEntries(results) as Record<KpiSlug, KpiCardSummary>;
}

export async function fetchKpiDetails(
  slug: KpiSlug,
  range: DateRange = '30d',
  granularity: Granularity = 'day',
  cursor?: string
): Promise<KpiDetailsResult> {
  const { from, to } = getDateRange(range);
  const filters: KpiFilters = { dateFrom: from, dateTo: to, granularity };

  // Fetch summary, series, and breakdown in parallel via edge function
  const detailMap: Record<KpiSlug, { summary: string; series: string; breakdown: string }> = {
    'mrr': { summary: 'mrr_card', series: 'mrr_timeseries', breakdown: 'mrr_by_plan' },
    'arpu': { summary: 'arpu_card', series: 'arpu_timeseries', breakdown: 'mrr_by_plan' },
    'conversion': { summary: 'conversion_card', series: 'conversion_timeseries', breakdown: 'conversion_funnel' },
    'churn': { summary: 'churn_card', series: 'churn_timeseries', breakdown: 'churn_by_plan' },
    'users-total': { summary: 'users_card', series: 'users_timeseries', breakdown: 'users_breakdown' },
    'subscribers-active': { summary: 'subscribers_card', series: 'subscribers_timeseries', breakdown: 'subscribers_summary' },
    'new-users': { summary: 'new_users_card', series: 'new_users_timeseries', breakdown: 'new_users_timeseries' },
    'tickets-open': { summary: 'tickets_card', series: 'tickets_timeseries', breakdown: 'tickets_by_category' },
    'menus-created': { summary: 'menus_card', series: 'menus_timeseries', breakdown: 'menus_timeseries' },
    'menus-per-user': { summary: 'menus_per_user_card', series: 'menus_timeseries', breakdown: 'menus_per_user_distribution' },
    'ratings': { summary: 'ratings_card', series: 'ratings_timeseries', breakdown: 'ratings_distribution' },
    'points-total': { summary: 'points_card', series: 'points_timeseries', breakdown: 'points_by_event_type' },
  };

  const actions = detailMap[slug];
  if (!actions) return { summary: { headline: 0 }, series: [], breakdown: [] };

  const [summary, series, breakdown] = await Promise.all([
    callAdminApi<KpiCardSummary>(actions.summary, filters),
    callAdminApi<TimeSeriesPoint[]>(actions.series, filters),
    callAdminApi<BreakdownRow[]>(actions.breakdown, filters),
  ]);

  return { summary, series, breakdown };
}

// ============= Legacy Types (for backward compatibility) =============

export interface MrrMovement {
  date: string;
  new_mrr: number;
  expansion: number;
  contraction: number;
  churned: number;
}

export interface MrrSummary {
  current_mrr: number;
  previous_mrr: number;
  net_change: number;
  new_mrr: number;
  expansion: number;
  contraction: number;
  churned: number;
}

export interface CustomerRow {
  id: string;
  email: string;
  name: string;
  mrr: number;
  plan: string;
  created_at: string;
}

export interface TicketRow {
  id: string;
  subject: string;
  status: string;
  priority: string;
  category: string;
  created_at: string;
  user_email: string;
}

export interface RecipeRatingRow {
  recipe_id: string;
  title: string;
  avg_rating: number;
  ratings_count: number;
}

export interface LeaderboardRow {
  user_id: string;
  email: string;
  name: string;
  total_points: number;
  rank: number;
}

// ============= Legacy Fetch Functions (all proxied through Edge Function) =============

// MRR
export async function fetchMrrSummary(filters: KpiFilters): Promise<MrrSummary> {
  return callAdminApi('mrr_summary', filters);
}
export async function fetchMrrTimeseries(filters: KpiFilters): Promise<TimeSeriesPoint[]> {
  return callAdminApi('mrr_timeseries', filters);
}
export async function fetchMrrByPlan(filters: KpiFilters): Promise<BreakdownRow[]> {
  return callAdminApi('mrr_by_plan', filters);
}
export async function fetchMrrTopCustomers(
  filters: KpiFilters, cursor?: string, limit = 20
): Promise<{ data: CustomerRow[]; nextCursor?: string }> {
  return callAdminApi('mrr_top_customers', { ...filters, cursor, limit } as any);
}

// ARPU
export async function fetchArpuSummary(filters: KpiFilters) {
  return callAdminApi<{ arpu_current: number; arpu_previous: number; active_users: number; total_revenue: number }>('arpu_summary', filters);
}
export async function fetchArpuTimeseries(filters: KpiFilters): Promise<TimeSeriesPoint[]> {
  return callAdminApi('arpu_timeseries', filters);
}
export async function fetchArpuByPlan(filters: KpiFilters): Promise<BreakdownRow[]> {
  return callAdminApi('mrr_by_plan', filters);
}

// Conversion
export async function fetchConversionFunnel(filters: KpiFilters): Promise<BreakdownRow[]> {
  return callAdminApi('conversion_funnel', filters);
}
export async function fetchConversionTimeseries(filters: KpiFilters): Promise<TimeSeriesPoint[]> {
  return callAdminApi('conversion_timeseries', filters);
}

// Churn
export async function fetchChurnSummary(filters: KpiFilters) {
  return callAdminApi<{ churn_rate: number; cancellations: number; retention_rate: number; avg_subscription_age: number }>('churn_summary', filters);
}
export async function fetchChurnTimeseries(filters: KpiFilters): Promise<TimeSeriesPoint[]> {
  return callAdminApi('churn_timeseries', filters);
}
export async function fetchChurnByPlan(filters: KpiFilters): Promise<BreakdownRow[]> {
  return callAdminApi('churn_by_plan', filters);
}

// Users
export async function fetchUsersSummary(filters: KpiFilters) {
  return callAdminApi<{ total_users: number; active_users_7d: number; active_users_30d: number; trial_users: number; paid_users: number }>('users_summary', filters);
}
export async function fetchUsersTimeseries(filters: KpiFilters): Promise<TimeSeriesPoint[]> {
  return callAdminApi('users_timeseries', filters);
}
export async function fetchUsersBreakdown(filters: KpiFilters): Promise<BreakdownRow[]> {
  return callAdminApi('users_breakdown', filters);
}

// Subscribers
export async function fetchSubscribersSummary(filters: KpiFilters) {
  return callAdminApi<{ active_subscribers: number; new_subscribers: number; cancelled_subscribers: number; plan_distribution: BreakdownRow[] }>('subscribers_summary', filters);
}
export async function fetchSubscribersTimeseries(filters: KpiFilters): Promise<TimeSeriesPoint[]> {
  return callAdminApi('subscribers_timeseries', filters);
}

// New Users
export async function fetchNewUsersSummary(filters: KpiFilters) {
  return callAdminApi<{ new_users: number; new_users_week: number; activation_rate: number }>('new_users_summary', filters);
}
export async function fetchNewUsersTimeseries(filters: KpiFilters): Promise<TimeSeriesPoint[]> {
  return callAdminApi('new_users_timeseries', filters);
}

// Tickets
export async function fetchTicketsSummary(filters: KpiFilters) {
  return callAdminApi<{ open_tickets: number; avg_first_response_time: number; avg_resolution_time: number; sla_breach_count: number }>('tickets_summary', filters);
}
export async function fetchTicketsTimeseries(filters: KpiFilters): Promise<TimeSeriesPoint[]> {
  return callAdminApi('tickets_timeseries', filters);
}
export async function fetchTicketsByCategory(filters: KpiFilters): Promise<BreakdownRow[]> {
  return callAdminApi('tickets_by_category', filters);
}
export async function fetchTicketList(
  filters: KpiFilters, cursor?: string, limit = 20, status?: string
): Promise<{ data: TicketRow[]; nextCursor?: string }> {
  return callAdminApi('tickets_list', { ...filters, cursor, limit, status } as any);
}

// Menus
export async function fetchMenusSummary(filters: KpiFilters) {
  return callAdminApi<{ menus_created: number; menus_today: number; menus_week: number; users_with_menus: number; avg_menus_per_user: number }>('menus_summary', filters);
}
export async function fetchMenusTimeseries(filters: KpiFilters): Promise<TimeSeriesPoint[]> {
  return callAdminApi('menus_timeseries', filters);
}
export async function fetchMenusPerUserSummary(filters: KpiFilters) {
  return callAdminApi<{ avg_menus_per_user: number; median_menus_per_user: number; p90_menus_per_user: number; active_users: number }>('menus_per_user_summary', filters);
}
export async function fetchMenusPerUserDistribution(filters: KpiFilters): Promise<BreakdownRow[]> {
  return callAdminApi('menus_per_user_distribution', filters);
}
export async function fetchTopMenuCreators(
  filters: KpiFilters, cursor?: string, limit = 20
): Promise<{ data: { user_id: string; email: string; menu_count: number }[]; nextCursor?: string }> {
  return callAdminApi('top_menu_creators', { ...filters, cursor, limit } as any);
}

// Ratings
export async function fetchRatingsSummary(filters: KpiFilters) {
  return callAdminApi<{ avg_rating: number; ratings_count: number; pct_4_5_stars: number }>('ratings_summary', filters);
}
export async function fetchRatingsTimeseries(filters: KpiFilters): Promise<TimeSeriesPoint[]> {
  return callAdminApi('ratings_timeseries', filters);
}
export async function fetchRatingsDistribution(filters: KpiFilters): Promise<BreakdownRow[]> {
  return callAdminApi('ratings_distribution', filters);
}

// Points
export async function fetchPointsSummary(filters: KpiFilters) {
  return callAdminApi<{ total_points: number; points_per_user: number; top_earners_count: number }>('points_summary', filters);
}
export async function fetchPointsTimeseries(filters: KpiFilters): Promise<TimeSeriesPoint[]> {
  return callAdminApi('points_timeseries', filters);
}
export async function fetchPointsByEventType(filters: KpiFilters): Promise<BreakdownRow[]> {
  return callAdminApi('points_by_event_type', filters);
}
export async function fetchPointsLeaderboard(
  filters: KpiFilters, cursor?: string, limit = 20
): Promise<{ data: LeaderboardRow[]; nextCursor?: string }> {
  return callAdminApi('points_leaderboard', { ...filters, cursor, limit } as any);
}
