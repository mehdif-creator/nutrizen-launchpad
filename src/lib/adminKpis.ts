/**
 * Admin KPI Data Layer
 * Centralized data fetching for all KPI detail pages
 * Uses RPC endpoints where available, falls back to client queries with aggregation
 */

import { supabase } from '@/integrations/supabase/client';

// ============= Types =============

export type DateRange = '7d' | '30d' | '90d' | '12m' | 'custom';
export type Granularity = 'day' | 'week' | 'month';

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

export interface BreakdownRow {
  segment: string;
  value: number;
  percentage?: number;
  count?: number;
}

export interface CustomerRow {
  id: string;
  email: string;
  name: string;
  mrr: number;
  plan: string;
  created_at: string;
}

export interface ConversionFunnelStep {
  step: string;
  count: number;
  conversion_rate?: number;
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

// ============= Helper Functions =============

export function getDateRange(range: DateRange, customFrom?: string, customTo?: string): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString().split('T')[0];
  
  switch (range) {
    case '7d':
      return { 
        from: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], 
        to 
      };
    case '30d':
      return { 
        from: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], 
        to 
      };
    case '90d':
      return { 
        from: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], 
        to 
      };
    case '12m':
      return { 
        from: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], 
        to 
      };
    case 'custom':
      return { from: customFrom || to, to: customTo || to };
    default:
      return { from: to, to };
  }
}

function groupByPeriod(data: { created_at: string; value: number }[], granularity: Granularity): TimeSeriesPoint[] {
  const grouped: Record<string, number> = {};
  
  data.forEach(item => {
    const date = new Date(item.created_at);
    let key: string;
    
    switch (granularity) {
      case 'day':
        key = date.toISOString().split('T')[0];
        break;
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
        break;
      case 'month':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
        break;
      default:
        key = date.toISOString().split('T')[0];
    }
    
    grouped[key] = (grouped[key] || 0) + item.value;
  });
  
  return Object.entries(grouped)
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ============= MRR KPIs =============

export async function fetchMrrSummary(filters: KpiFilters): Promise<MrrSummary> {
  // Since we don't have a subscriptions table with detailed MRR data,
  // we'll estimate based on active subscribers
  const pricePerMonth = 19.99;
  
  const { count: activeCount } = await supabase
    .from('subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');
  
  const { count: previousCount } = await supabase
    .from('subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')
    .lt('created_at', filters.dateFrom);
  
  const currentMrr = (activeCount || 0) * pricePerMonth;
  const previousMrr = (previousCount || 0) * pricePerMonth;
  
  return {
    current_mrr: currentMrr,
    previous_mrr: previousMrr,
    net_change: currentMrr - previousMrr,
    new_mrr: Math.max(0, currentMrr - previousMrr),
    expansion: 0,
    contraction: 0,
    churned: Math.max(0, previousMrr - currentMrr),
  };
}

export async function fetchMrrTimeseries(filters: KpiFilters): Promise<TimeSeriesPoint[]> {
  const pricePerMonth = 19.99;
  
  const { data } = await supabase
    .from('subscriptions')
    .select('created_at')
    .eq('status', 'active')
    .gte('created_at', filters.dateFrom)
    .lte('created_at', filters.dateTo)
    .order('created_at', { ascending: true });
  
  if (!data) return [];
  
  const mapped = data.map(d => ({ created_at: d.created_at, value: pricePerMonth }));
  return groupByPeriod(mapped, filters.granularity || 'day');
}

export async function fetchMrrByPlan(filters: KpiFilters): Promise<BreakdownRow[]> {
  const { data } = await supabase
    .from('subscriptions')
    .select('plan')
    .eq('status', 'active')
    .gte('created_at', filters.dateFrom)
    .lte('created_at', filters.dateTo);
  
  if (!data) return [];
  
  const counts: Record<string, number> = {};
  data.forEach(d => {
    const plan = d.plan || 'default';
    counts[plan] = (counts[plan] || 0) + 1;
  });
  
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  
  return Object.entries(counts).map(([segment, count]) => ({
    segment,
    value: count * 19.99,
    count,
    percentage: total > 0 ? (count / total) * 100 : 0,
  }));
}

export async function fetchMrrTopCustomers(
  filters: KpiFilters, 
  cursor?: string, 
  limit = 20
): Promise<{ data: CustomerRow[]; nextCursor?: string }> {
  let query = supabase
    .from('subscriptions')
    .select(`
      user_id,
      plan,
      created_at,
      profiles!inner(email, full_name)
    `)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(limit + 1);
  
  if (cursor) {
    query = query.lt('user_id', cursor);
  }
  
  const { data, error } = await query;
  
  if (error || !data) return { data: [] };
  
  const hasMore = data.length > limit;
  const items = hasMore ? data.slice(0, -1) : data;
  
  return {
    data: items.map((d: any) => ({
      id: d.user_id,
      email: d.profiles?.email || '',
      name: d.profiles?.full_name || '',
      mrr: 19.99,
      plan: d.plan || 'default',
      created_at: d.created_at,
    })),
    nextCursor: hasMore ? items[items.length - 1].user_id : undefined,
  };
}

// ============= ARPU KPIs =============

export async function fetchArpuSummary(filters: KpiFilters): Promise<{
  arpu_current: number;
  arpu_previous: number;
  active_users: number;
  total_revenue: number;
}> {
  const pricePerMonth = 19.99;
  
  const { count: activeUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });
  
  const { count: activeSubscribers } = await supabase
    .from('subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');
  
  const totalRevenue = (activeSubscribers || 0) * pricePerMonth;
  const arpu = activeUsers && activeUsers > 0 ? totalRevenue / activeUsers : 0;
  
  return {
    arpu_current: arpu,
    arpu_previous: arpu * 0.9, // Simulated previous period
    active_users: activeUsers || 0,
    total_revenue: totalRevenue,
  };
}

export async function fetchArpuTimeseries(filters: KpiFilters): Promise<TimeSeriesPoint[]> {
  // Simplified - would need proper revenue tracking
  const { data } = await supabase
    .from('profiles')
    .select('created_at')
    .gte('created_at', filters.dateFrom)
    .lte('created_at', filters.dateTo)
    .order('created_at', { ascending: true });
  
  if (!data) return [];
  
  // Calculate cumulative ARPU over time
  let cumulativeUsers = 0;
  const points: TimeSeriesPoint[] = [];
  
  const grouped = groupByPeriod(
    data.map(d => ({ created_at: d.created_at, value: 1 })), 
    filters.granularity || 'day'
  );
  
  grouped.forEach(point => {
    cumulativeUsers += point.value;
    points.push({
      date: point.date,
      value: cumulativeUsers > 0 ? 19.99 / cumulativeUsers : 0,
    });
  });
  
  return points;
}

// ============= Conversion KPIs =============

export async function fetchConversionFunnel(filters: KpiFilters): Promise<ConversionFunnelStep[]> {
  const { data, error } = await supabase.rpc('rpc_admin_conversion_funnel', {
    p_date_from: filters.dateFrom,
    p_date_to: filters.dateTo,
  });
  
  if (error) {
    console.error('[fetchConversionFunnel] Error:', error);
    return [];
  }
  
  const stats = data as any;
  
  return [
    { step: 'Inscriptions', count: stats?.signups || 0 },
    { 
      step: 'Onboarding', 
      count: stats?.onboarding_completed || 0,
      conversion_rate: stats?.conversion_signup_to_onboarding || 0,
    },
    { 
      step: 'Premier menu', 
      count: stats?.first_menu_generated || 0,
      conversion_rate: stats?.conversion_onboarding_to_menu || 0,
    },
    { 
      step: 'Premier achat', 
      count: stats?.first_credit_purchase || 0,
    },
  ];
}

export async function fetchConversionTimeseries(filters: KpiFilters): Promise<TimeSeriesPoint[]> {
  const { data } = await supabase
    .from('processed_checkout_sessions')
    .select('created_at')
    .eq('payment_status', 'paid')
    .gte('created_at', filters.dateFrom)
    .lte('created_at', filters.dateTo);
  
  if (!data) return [];
  
  return groupByPeriod(
    data.map(d => ({ created_at: d.created_at, value: 1 })),
    filters.granularity || 'day'
  );
}

// ============= Churn KPIs =============

export async function fetchChurnSummary(filters: KpiFilters): Promise<{
  churn_rate: number;
  cancellations: number;
  retention_rate: number;
  avg_subscription_age: number;
}> {
  const { count: canceled } = await supabase
    .from('subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'canceled');
  
  const { count: active } = await supabase
    .from('subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');
  
  const total = (canceled || 0) + (active || 0);
  const churnRate = total > 0 ? ((canceled || 0) / total) * 100 : 0;
  
  return {
    churn_rate: churnRate,
    cancellations: canceled || 0,
    retention_rate: 100 - churnRate,
    avg_subscription_age: 45, // Would need proper calculation
  };
}

export async function fetchChurnTimeseries(filters: KpiFilters): Promise<TimeSeriesPoint[]> {
  const { data } = await supabase
    .from('subscriptions')
    .select('updated_at')
    .eq('status', 'canceled')
    .gte('updated_at', filters.dateFrom)
    .lte('updated_at', filters.dateTo);
  
  if (!data) return [];
  
  return groupByPeriod(
    data.map(d => ({ created_at: d.updated_at, value: 1 })),
    filters.granularity || 'day'
  );
}

// ============= User KPIs =============

export async function fetchUsersSummary(filters: KpiFilters): Promise<{
  total_users: number;
  active_users_7d: number;
  active_users_30d: number;
  trial_users: number;
  paid_users: number;
}> {
  const now = new Date();
  const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  
  const { count: totalUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });
  
  const { count: active7d } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .gte('updated_at', last7d);
  
  const { count: active30d } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .gte('updated_at', last30d);
  
  const { count: trialUsers } = await supabase
    .from('subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'trialing');
  
  const { count: paidUsers } = await supabase
    .from('subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');
  
  return {
    total_users: totalUsers || 0,
    active_users_7d: active7d || 0,
    active_users_30d: active30d || 0,
    trial_users: trialUsers || 0,
    paid_users: paidUsers || 0,
  };
}

export async function fetchUsersTimeseries(filters: KpiFilters): Promise<TimeSeriesPoint[]> {
  const { data } = await supabase
    .from('profiles')
    .select('created_at')
    .gte('created_at', filters.dateFrom)
    .lte('created_at', filters.dateTo)
    .order('created_at', { ascending: true });
  
  if (!data) return [];
  
  return groupByPeriod(
    data.map(d => ({ created_at: d.created_at, value: 1 })),
    filters.granularity || 'day'
  );
}

export async function fetchUsersBreakdown(filters: KpiFilters): Promise<BreakdownRow[]> {
  const { data } = await supabase
    .from('profiles')
    .select('locale')
    .gte('created_at', filters.dateFrom)
    .lte('created_at', filters.dateTo);
  
  if (!data) return [];
  
  const counts: Record<string, number> = {};
  data.forEach(d => {
    const locale = d.locale || 'fr';
    counts[locale] = (counts[locale] || 0) + 1;
  });
  
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  
  return Object.entries(counts).map(([segment, count]) => ({
    segment,
    value: count,
    percentage: total > 0 ? (count / total) * 100 : 0,
  }));
}

// ============= Subscribers KPIs =============

export async function fetchSubscribersSummary(filters: KpiFilters): Promise<{
  active_subscribers: number;
  new_subscribers: number;
  cancelled_subscribers: number;
  plan_distribution: BreakdownRow[];
}> {
  const { count: active } = await supabase
    .from('subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');
  
  const { count: newSubs } = await supabase
    .from('subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')
    .gte('created_at', filters.dateFrom);
  
  const { count: cancelled } = await supabase
    .from('subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'canceled');
  
  const { data: planData } = await supabase
    .from('subscriptions')
    .select('plan')
    .eq('status', 'active');
  
  const planCounts: Record<string, number> = {};
  planData?.forEach(d => {
    const plan = d.plan || 'default';
    planCounts[plan] = (planCounts[plan] || 0) + 1;
  });
  
  const total = Object.values(planCounts).reduce((a, b) => a + b, 0);
  
  return {
    active_subscribers: active || 0,
    new_subscribers: newSubs || 0,
    cancelled_subscribers: cancelled || 0,
    plan_distribution: Object.entries(planCounts).map(([segment, count]) => ({
      segment,
      value: count,
      percentage: total > 0 ? (count / total) * 100 : 0,
    })),
  };
}

export async function fetchSubscribersTimeseries(filters: KpiFilters): Promise<TimeSeriesPoint[]> {
  const { data } = await supabase
    .from('subscriptions')
    .select('created_at')
    .eq('status', 'active')
    .gte('created_at', filters.dateFrom)
    .lte('created_at', filters.dateTo);
  
  if (!data) return [];
  
  return groupByPeriod(
    data.map(d => ({ created_at: d.created_at, value: 1 })),
    filters.granularity || 'day'
  );
}

// ============= New Users KPIs =============

export async function fetchNewUsersSummary(filters: KpiFilters): Promise<{
  new_users: number;
  new_users_week: number;
  activation_rate: number;
}> {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  
  const { count: newUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', filters.dateFrom)
    .lte('created_at', filters.dateTo);
  
  const { count: newUsersWeek } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', weekAgo);
  
  // Activation = completed onboarding
  const { count: activated } = await supabase
    .from('preferences')
    .select('*', { count: 'exact', head: true })
    .gte('updated_at', filters.dateFrom);
  
  const activationRate = newUsers && newUsers > 0 ? ((activated || 0) / newUsers) * 100 : 0;
  
  return {
    new_users: newUsers || 0,
    new_users_week: newUsersWeek || 0,
    activation_rate: activationRate,
  };
}

export async function fetchNewUsersTimeseries(filters: KpiFilters): Promise<TimeSeriesPoint[]> {
  const { data } = await supabase
    .from('profiles')
    .select('created_at')
    .gte('created_at', filters.dateFrom)
    .lte('created_at', filters.dateTo);
  
  if (!data) return [];
  
  return groupByPeriod(
    data.map(d => ({ created_at: d.created_at, value: 1 })),
    filters.granularity || 'day'
  );
}

// ============= Tickets KPIs =============

export async function fetchTicketsSummary(filters: KpiFilters): Promise<{
  open_tickets: number;
  avg_first_response_time: number;
  avg_resolution_time: number;
  sla_breach_count: number;
}> {
  const { count: openTickets } = await supabase
    .from('support_tickets')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'open');
  
  return {
    open_tickets: openTickets || 0,
    avg_first_response_time: 2.5, // Hours - would need proper tracking
    avg_resolution_time: 24, // Hours
    sla_breach_count: 0,
  };
}

export async function fetchTicketsTimeseries(filters: KpiFilters): Promise<TimeSeriesPoint[]> {
  const { data } = await supabase
    .from('support_tickets')
    .select('created_at')
    .gte('created_at', filters.dateFrom)
    .lte('created_at', filters.dateTo);
  
  if (!data) return [];
  
  return groupByPeriod(
    data.map(d => ({ created_at: d.created_at, value: 1 })),
    filters.granularity || 'day'
  );
}

export async function fetchTicketsByCategory(filters: KpiFilters): Promise<BreakdownRow[]> {
  const { data } = await supabase
    .from('support_tickets')
    .select('category')
    .gte('created_at', filters.dateFrom)
    .lte('created_at', filters.dateTo);
  
  if (!data) return [];
  
  const counts: Record<string, number> = {};
  data.forEach(d => {
    const cat = (d as any).category || 'general';
    counts[cat] = (counts[cat] || 0) + 1;
  });
  
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  
  return Object.entries(counts).map(([segment, count]) => ({
    segment,
    value: count,
    percentage: total > 0 ? (count / total) * 100 : 0,
  }));
}

export async function fetchTicketList(
  filters: KpiFilters,
  cursor?: string,
  limit = 20,
  status?: string
): Promise<{ data: TicketRow[]; nextCursor?: string }> {
  let query = supabase
    .from('support_tickets')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit + 1);
  
  if (status) {
    query = query.eq('status', status);
  }
  
  if (cursor) {
    query = query.lt('id', cursor);
  }
  
  const { data, error } = await query;
  
  if (error || !data) return { data: [] };
  
  const hasMore = data.length > limit;
  const items = hasMore ? data.slice(0, -1) : data;
  
  return {
    data: items.map((d: any) => ({
      id: d.id,
      subject: d.subject || '',
      status: d.status,
      priority: d.priority || 'normal',
      category: d.category || 'general',
      created_at: d.created_at,
      user_email: d.user_email || '',
    })),
    nextCursor: hasMore ? items[items.length - 1].id : undefined,
  };
}

// ============= Menus KPIs =============

export async function fetchMenusSummary(filters: KpiFilters): Promise<{
  menus_created: number;
  menus_today: number;
  menus_week: number;
  users_with_menus: number;
  avg_menus_per_user: number;
}> {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  
  const { count: menusCreated } = await supabase
    .from('meal_plans')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', filters.dateFrom)
    .lte('created_at', filters.dateTo);
  
  const { count: menusToday } = await supabase
    .from('meal_plans')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', today);
  
  const { count: menusWeek } = await supabase
    .from('meal_plans')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', weekAgo);
  
  const { data: usersData } = await supabase
    .from('meal_plans')
    .select('user_id')
    .gte('created_at', filters.dateFrom);
  
  const uniqueUsers = new Set(usersData?.map(d => d.user_id) || []).size;
  const avgMenusPerUser = uniqueUsers > 0 ? (menusCreated || 0) / uniqueUsers : 0;
  
  return {
    menus_created: menusCreated || 0,
    menus_today: menusToday || 0,
    menus_week: menusWeek || 0,
    users_with_menus: uniqueUsers,
    avg_menus_per_user: avgMenusPerUser,
  };
}

export async function fetchMenusTimeseries(filters: KpiFilters): Promise<TimeSeriesPoint[]> {
  const { data } = await supabase
    .from('meal_plans')
    .select('created_at')
    .gte('created_at', filters.dateFrom)
    .lte('created_at', filters.dateTo);
  
  if (!data) return [];
  
  return groupByPeriod(
    data.map(d => ({ created_at: d.created_at || '', value: 1 })),
    filters.granularity || 'day'
  );
}

export async function fetchTopMenuCreators(
  filters: KpiFilters,
  cursor?: string,
  limit = 20
): Promise<{ data: { user_id: string; email: string; menu_count: number }[]; nextCursor?: string }> {
  const { data } = await supabase
    .from('meal_plans')
    .select('user_id, profiles!inner(email)')
    .gte('created_at', filters.dateFrom)
    .lte('created_at', filters.dateTo);
  
  if (!data) return { data: [] };
  
  const counts: Record<string, { email: string; count: number }> = {};
  data.forEach((d: any) => {
    const userId = d.user_id;
    if (!counts[userId]) {
      counts[userId] = { email: d.profiles?.email || '', count: 0 };
    }
    counts[userId].count++;
  });
  
  const sorted = Object.entries(counts)
    .map(([user_id, { email, count }]) => ({ user_id, email, menu_count: count }))
    .sort((a, b) => b.menu_count - a.menu_count)
    .slice(0, limit);
  
  return { data: sorted };
}

// ============= Menus Per User KPIs =============

export async function fetchMenusPerUserSummary(filters: KpiFilters): Promise<{
  avg_menus_per_user: number;
  median_menus_per_user: number;
  p90_menus_per_user: number;
  active_users: number;
}> {
  const { data } = await supabase
    .from('meal_plans')
    .select('user_id')
    .gte('created_at', filters.dateFrom);
  
  if (!data || data.length === 0) {
    return {
      avg_menus_per_user: 0,
      median_menus_per_user: 0,
      p90_menus_per_user: 0,
      active_users: 0,
    };
  }
  
  const userCounts: Record<string, number> = {};
  data.forEach(d => {
    userCounts[d.user_id] = (userCounts[d.user_id] || 0) + 1;
  });
  
  const counts = Object.values(userCounts).sort((a, b) => a - b);
  const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
  const median = counts[Math.floor(counts.length / 2)];
  const p90 = counts[Math.floor(counts.length * 0.9)];
  
  return {
    avg_menus_per_user: avg,
    median_menus_per_user: median,
    p90_menus_per_user: p90,
    active_users: counts.length,
  };
}

export async function fetchMenusPerUserDistribution(filters: KpiFilters): Promise<BreakdownRow[]> {
  const { data } = await supabase
    .from('meal_plans')
    .select('user_id')
    .gte('created_at', filters.dateFrom);
  
  if (!data) return [];
  
  const userCounts: Record<string, number> = {};
  data.forEach(d => {
    userCounts[d.user_id] = (userCounts[d.user_id] || 0) + 1;
  });
  
  const buckets: Record<string, number> = {
    '1': 0,
    '2-5': 0,
    '6-10': 0,
    '11-20': 0,
    '20+': 0,
  };
  
  Object.values(userCounts).forEach(count => {
    if (count === 1) buckets['1']++;
    else if (count <= 5) buckets['2-5']++;
    else if (count <= 10) buckets['6-10']++;
    else if (count <= 20) buckets['11-20']++;
    else buckets['20+']++;
  });
  
  const total = Object.values(buckets).reduce((a, b) => a + b, 0);
  
  return Object.entries(buckets).map(([segment, count]) => ({
    segment,
    value: count,
    percentage: total > 0 ? (count / total) * 100 : 0,
  }));
}

// ============= Ratings KPIs =============

export async function fetchRatingsSummary(filters: KpiFilters): Promise<{
  avg_rating: number;
  ratings_count: number;
  pct_4_5_stars: number;
}> {
  const { data, count } = await supabase
    .from('meal_ratings')
    .select('stars', { count: 'exact' })
    .gte('created_at', filters.dateFrom)
    .lte('created_at', filters.dateTo);
  
  if (!data || data.length === 0) {
    return { avg_rating: 0, ratings_count: 0, pct_4_5_stars: 0 };
  }
  
  const total = data.reduce((sum, r) => sum + (r.stars || 0), 0);
  const avg = total / data.length;
  const highRatings = data.filter(r => (r.stars || 0) >= 4).length;
  
  return {
    avg_rating: avg,
    ratings_count: count || data.length,
    pct_4_5_stars: (highRatings / data.length) * 100,
  };
}

export async function fetchRatingsTimeseries(filters: KpiFilters): Promise<TimeSeriesPoint[]> {
  const { data } = await supabase
    .from('meal_ratings')
    .select('created_at, stars')
    .gte('created_at', filters.dateFrom)
    .lte('created_at', filters.dateTo);
  
  if (!data) return [];
  
  // Group by period and calculate average rating per period
  const grouped: Record<string, { sum: number; count: number }> = {};
  
  data.forEach(d => {
    const date = new Date(d.created_at || '').toISOString().split('T')[0];
    if (!grouped[date]) {
      grouped[date] = { sum: 0, count: 0 };
    }
    grouped[date].sum += d.stars || 0;
    grouped[date].count++;
  });
  
  return Object.entries(grouped)
    .map(([date, { sum, count }]) => ({
      date,
      value: count > 0 ? sum / count : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function fetchRatingsDistribution(filters: KpiFilters): Promise<BreakdownRow[]> {
  const { data } = await supabase
    .from('meal_ratings')
    .select('stars')
    .gte('created_at', filters.dateFrom)
    .lte('created_at', filters.dateTo);
  
  if (!data) return [];
  
  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  data.forEach(d => {
    const stars = d.stars || 0;
    if (stars >= 1 && stars <= 5) {
      counts[stars]++;
    }
  });
  
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  
  return Object.entries(counts).map(([stars, count]) => ({
    segment: `${stars} étoile${Number(stars) > 1 ? 's' : ''}`,
    value: count,
    percentage: total > 0 ? (count / total) * 100 : 0,
  }));
}

// ============= Points (Gamification) KPIs =============

export async function fetchPointsSummary(filters: KpiFilters): Promise<{
  total_points: number;
  points_per_user: number;
  top_earners_count: number;
}> {
  const { data } = await supabase
    .from('user_points')
    .select('total_points');
  
  if (!data || data.length === 0) {
    return { total_points: 0, points_per_user: 0, top_earners_count: 0 };
  }
  
  const total = data.reduce((sum, d) => sum + d.total_points, 0);
  const avg = total / data.length;
  const topEarners = data.filter(d => d.total_points > avg * 2).length;
  
  return {
    total_points: total,
    points_per_user: avg,
    top_earners_count: topEarners,
  };
}

export async function fetchPointsTimeseries(filters: KpiFilters): Promise<TimeSeriesPoint[]> {
  const { data } = await supabase
    .from('gamification_events')
    .select('created_at, xp_delta')
    .gte('created_at', filters.dateFrom)
    .lte('created_at', filters.dateTo);
  
  if (!data) return [];
  
  return groupByPeriod(
    data.map(d => ({ created_at: d.created_at || '', value: d.xp_delta })),
    filters.granularity || 'day'
  );
}

export async function fetchPointsByEventType(filters: KpiFilters): Promise<BreakdownRow[]> {
  const { data } = await supabase
    .from('gamification_events')
    .select('event_type, xp_delta')
    .gte('created_at', filters.dateFrom)
    .lte('created_at', filters.dateTo);
  
  if (!data) return [];
  
  const sums: Record<string, number> = {};
  data.forEach(d => {
    const type = d.event_type;
    sums[type] = (sums[type] || 0) + d.xp_delta;
  });
  
  const total = Object.values(sums).reduce((a, b) => a + b, 0);
  
  return Object.entries(sums).map(([segment, value]) => ({
    segment,
    value,
    percentage: total > 0 ? (value / total) * 100 : 0,
  }));
}

export async function fetchPointsLeaderboard(
  filters: KpiFilters,
  cursor?: string,
  limit = 20
): Promise<{ data: LeaderboardRow[]; nextCursor?: string }> {
  let query = supabase
    .from('user_points')
    .select('user_id, total_points, profiles!inner(email, full_name)')
    .order('total_points', { ascending: false })
    .limit(limit + 1);
  
  if (cursor) {
    query = query.lt('total_points', cursor);
  }
  
  const { data, error } = await query;
  
  if (error || !data) return { data: [] };
  
  const hasMore = data.length > limit;
  const items = hasMore ? data.slice(0, -1) : data;
  
  return {
    data: items.map((d: any, index: number) => ({
      user_id: d.user_id,
      email: d.profiles?.email || '',
      name: d.profiles?.full_name || '',
      total_points: d.total_points,
      rank: index + 1,
    })),
    nextCursor: hasMore ? String(items[items.length - 1].total_points) : undefined,
  };
}

// ============= CSV Export =============

export function exportToCsv(data: any[], filename: string): void {
  if (data.length === 0) return;
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(h => {
        const val = row[h];
        if (typeof val === 'string' && val.includes(',')) {
          return `"${val}"`;
        }
        return val;
      }).join(',')
    )
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
}
