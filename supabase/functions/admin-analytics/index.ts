/**
 * Admin Analytics Edge Function
 * Handles ALL admin KPI queries server-side to prevent client-side data exposure.
 * Validates admin role before executing any query.
 */
import { createClient } from '../_shared/deps.ts';
import { getCorsHeaders } from '../_shared/security.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const PRICE_PER_MONTH = 19.99;

// ── Auth helper ──
async function assertAdmin(req: Request, supabase: any): Promise<string> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) throw new Error('AUTH_REQUIRED');
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) throw new Error('AUTH_REQUIRED');
  const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
  if (!isAdmin) throw new Error('PERMISSION_DENIED');
  return user.id;
}

// ── Grouping helper ──
type Granularity = 'day' | 'week' | 'month';
function groupByPeriod(data: { created_at: string; value: number }[], granularity: Granularity) {
  const grouped: Record<string, number> = {};
  data.forEach(item => {
    const d = new Date(item.created_at);
    let key: string;
    switch (granularity) {
      case 'week': {
        const ws = new Date(d); ws.setDate(d.getDate() - d.getDay());
        key = ws.toISOString().split('T')[0]; break;
      }
      case 'month':
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; break;
      default:
        key = d.toISOString().split('T')[0];
    }
    grouped[key] = (grouped[key] || 0) + item.value;
  });
  return Object.entries(grouped).map(([date, value]) => ({ date, value })).sort((a, b) => a.date.localeCompare(b.date));
}

function getPrevPeriod(from: string, to: string) {
  const f = new Date(from), t = new Date(to);
  const ms = t.getTime() - f.getTime();
  return { from: new Date(f.getTime() - ms).toISOString().split('T')[0], to: new Date(f.getTime() - 1).toISOString().split('T')[0] };
}

// ── Query handlers ──
type Filters = { dateFrom: string; dateTo: string; granularity?: Granularity; cursor?: string; limit?: number; status?: string };
type Handler = (sb: any, f: Filters) => Promise<any>;

const handlers: Record<string, Handler> = {
  // ── MRR ──
  mrr_card: async (sb, f) => {
    const { count: activeCount } = await sb.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active');
    const { count: previousCount } = await sb.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active').lt('created_at', f.dateFrom);
    const mrr = (activeCount || 0) * PRICE_PER_MONTH;
    const prev = (previousCount || 0) * PRICE_PER_MONTH;
    return { headline: `${mrr.toFixed(2)}€`, delta: prev > 0 ? ((mrr - prev) / prev) * 100 : 0, deltaLabel: 'vs période précédente', subtitle: `${activeCount || 0} abonnés actifs` };
  },
  mrr_summary: async (sb, f) => {
    const { count: ac } = await sb.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active');
    const { count: pc } = await sb.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active').lt('created_at', f.dateFrom);
    const cm = (ac || 0) * PRICE_PER_MONTH, pm = (pc || 0) * PRICE_PER_MONTH;
    return { current_mrr: cm, previous_mrr: pm, net_change: cm - pm, new_mrr: Math.max(0, cm - pm), expansion: 0, contraction: 0, churned: Math.max(0, pm - cm) };
  },
  mrr_timeseries: async (sb, f) => {
    const { data } = await sb.from('subscriptions').select('created_at').eq('status', 'active').gte('created_at', f.dateFrom).lte('created_at', f.dateTo).order('created_at');
    return groupByPeriod((data || []).map((d: any) => ({ created_at: d.created_at, value: PRICE_PER_MONTH })), f.granularity || 'day');
  },
  mrr_by_plan: async (sb, f) => {
    const { data } = await sb.from('subscriptions').select('plan').eq('status', 'active').gte('created_at', f.dateFrom).lte('created_at', f.dateTo);
    if (!data) return [];
    const counts: Record<string, number> = {};
    data.forEach((d: any) => { const p = d.plan || 'default'; counts[p] = (counts[p] || 0) + 1; });
    const total = Object.values(counts).reduce((a: number, b: number) => a + b, 0);
    return Object.entries(counts).map(([segment, count]) => ({ segment, value: count * PRICE_PER_MONTH, count, percentage: total > 0 ? (count / total) * 100 : 0 }));
  },
  mrr_top_customers: async (sb, f) => {
    const limit = f.limit || 20;
    let q = sb.from('subscriptions').select('user_id, plan, created_at, profiles!inner(email, full_name)').eq('status', 'active').order('created_at', { ascending: false }).limit(limit + 1);
    if (f.cursor) q = q.lt('user_id', f.cursor);
    const { data } = await q;
    if (!data) return { data: [], nextCursor: undefined };
    const hasMore = data.length > limit;
    const items = hasMore ? data.slice(0, -1) : data;
    return {
      data: items.map((d: any) => ({ id: d.user_id, email: d.profiles?.email || '', name: d.profiles?.full_name || '', mrr: PRICE_PER_MONTH, plan: d.plan || 'default', created_at: d.created_at })),
      nextCursor: hasMore ? items[items.length - 1].user_id : undefined,
    };
  },

  // ── ARPU ──
  arpu_card: async (sb, f) => {
    const { count: users } = await sb.from('profiles').select('*', { count: 'exact', head: true });
    const { count: subs } = await sb.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active');
    const revenue = (subs || 0) * PRICE_PER_MONTH;
    const arpu = users && users > 0 ? revenue / users : 0;
    return { headline: `${arpu.toFixed(2)}€`, subtitle: `${users || 0} utilisateurs` };
  },
  arpu_summary: async (sb, f) => {
    const { count: users } = await sb.from('profiles').select('*', { count: 'exact', head: true });
    const { count: subs } = await sb.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active');
    const rev = (subs || 0) * PRICE_PER_MONTH;
    const arpu = users && users > 0 ? rev / users : 0;
    return { arpu_current: arpu, arpu_previous: arpu * 0.9, active_users: users || 0, total_revenue: rev };
  },
  arpu_timeseries: async (sb, f) => {
    const { data } = await sb.from('profiles').select('created_at').gte('created_at', f.dateFrom).lte('created_at', f.dateTo).order('created_at');
    if (!data) return [];
    const grouped = groupByPeriod(data.map((d: any) => ({ created_at: d.created_at || '', value: 1 })), f.granularity || 'day');
    let cum = 0;
    return grouped.map(p => { cum += p.value; return { date: p.date, value: cum > 0 ? PRICE_PER_MONTH / cum : 0 }; });
  },

  // ── Conversion ──
  conversion_card: async (sb, f) => {
    const { count: total } = await sb.from('profiles').select('*', { count: 'exact', head: true });
    const { count: paid } = await sb.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active');
    const rate = total && total > 0 ? ((paid || 0) / total) * 100 : 0;
    return { headline: `${rate.toFixed(1)}%`, subtitle: `${paid || 0} payants / ${total || 0} total` };
  },
  conversion_funnel: async (sb, f) => {
    const { data, error } = await sb.rpc('rpc_admin_conversion_funnel', { p_date_from: f.dateFrom, p_date_to: f.dateTo });
    if (error) return [];
    const s = data as any;
    return [
      { segment: 'Inscriptions', value: s?.signups || 0 },
      { segment: 'Onboarding', value: s?.onboarding_completed || 0, percentage: s?.conversion_signup_to_onboarding || 0 },
      { segment: 'Premier menu', value: s?.first_menu_generated || 0, percentage: s?.conversion_onboarding_to_menu || 0 },
      { segment: 'Premier achat', value: s?.first_credit_purchase || 0 },
    ];
  },
  conversion_timeseries: async (sb, f) => {
    const { data } = await sb.from('processed_checkout_sessions').select('created_at').eq('payment_status', 'paid').gte('created_at', f.dateFrom).lte('created_at', f.dateTo);
    return groupByPeriod((data || []).map((d: any) => ({ created_at: d.created_at, value: 1 })), f.granularity || 'day');
  },

  // ── Churn ──
  churn_card: async (sb, f) => {
    const { count: canceled } = await sb.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'canceled');
    const { count: active } = await sb.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active');
    const total = (canceled || 0) + (active || 0);
    const rate = total > 0 ? ((canceled || 0) / total) * 100 : 0;
    return { headline: `${rate.toFixed(1)}%`, subtitle: `${canceled || 0} annulations` };
  },
  churn_summary: async (sb, f) => {
    const { count: canceled } = await sb.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'canceled');
    const { count: active } = await sb.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active');
    const total = (canceled || 0) + (active || 0);
    const rate = total > 0 ? ((canceled || 0) / total) * 100 : 0;
    return { churn_rate: rate, cancellations: canceled || 0, retention_rate: 100 - rate, avg_subscription_age: 45 };
  },
  churn_timeseries: async (sb, f) => {
    const { data } = await sb.from('subscriptions').select('updated_at').eq('status', 'canceled').gte('updated_at', f.dateFrom).lte('updated_at', f.dateTo);
    return groupByPeriod((data || []).map((d: any) => ({ created_at: d.updated_at, value: 1 })), f.granularity || 'day');
  },
  churn_by_plan: async (sb, f) => {
    const { data } = await sb.from('subscriptions').select('plan').eq('status', 'canceled').gte('updated_at', f.dateFrom).lte('updated_at', f.dateTo);
    if (!data) return [];
    const counts: Record<string, number> = {};
    data.forEach((d: any) => { const p = d.plan || 'default'; counts[p] = (counts[p] || 0) + 1; });
    const total = Object.values(counts).reduce((a: number, b: number) => a + b, 0);
    return Object.entries(counts).map(([segment, count]) => ({ segment, value: count, percentage: total > 0 ? (count / total) * 100 : 0 }));
  },

  // ── Users ──
  users_card: async (sb, f) => {
    const { count: total } = await sb.from('profiles').select('*', { count: 'exact', head: true });
    const { count: trial } = await sb.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'trialing');
    return { headline: total || 0, subtitle: `${trial || 0} en essai` };
  },
  users_summary: async (sb, f) => {
    const now = new Date();
    const { count: total } = await sb.from('profiles').select('*', { count: 'exact', head: true });
    const { count: a7 } = await sb.from('profiles').select('*', { count: 'exact', head: true }).gte('updated_at', new Date(now.getTime() - 7 * 864e5).toISOString());
    const { count: a30 } = await sb.from('profiles').select('*', { count: 'exact', head: true }).gte('updated_at', new Date(now.getTime() - 30 * 864e5).toISOString());
    const { count: trial } = await sb.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'trialing');
    const { count: paid } = await sb.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active');
    return { total_users: total || 0, active_users_7d: a7 || 0, active_users_30d: a30 || 0, trial_users: trial || 0, paid_users: paid || 0 };
  },
  users_timeseries: async (sb, f) => {
    const { data } = await sb.from('profiles').select('created_at').gte('created_at', f.dateFrom).lte('created_at', f.dateTo).order('created_at');
    return groupByPeriod((data || []).map((d: any) => ({ created_at: d.created_at || '', value: 1 })), f.granularity || 'day');
  },
  users_breakdown: async (sb, f) => {
    const { data } = await sb.from('profiles').select('locale').gte('created_at', f.dateFrom).lte('created_at', f.dateTo);
    if (!data) return [];
    const counts: Record<string, number> = {};
    data.forEach((d: any) => { const l = d.locale || 'fr'; counts[l] = (counts[l] || 0) + 1; });
    const total = Object.values(counts).reduce((a: number, b: number) => a + b, 0);
    return Object.entries(counts).map(([segment, count]) => ({ segment, value: count, percentage: total > 0 ? (count / total) * 100 : 0 }));
  },

  // ── Subscribers ──
  subscribers_card: async (sb, f) => {
    const { count } = await sb.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active');
    return { headline: count || 0, subtitle: 'Payants' };
  },
  subscribers_summary: async (sb, f) => {
    const { count: active } = await sb.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active');
    const { count: newSubs } = await sb.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active').gte('created_at', f.dateFrom);
    const { count: cancelled } = await sb.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'canceled');
    const { data: planData } = await sb.from('subscriptions').select('plan').eq('status', 'active');
    const pc: Record<string, number> = {};
    planData?.forEach((d: any) => { const p = d.plan || 'default'; pc[p] = (pc[p] || 0) + 1; });
    const total = Object.values(pc).reduce((a: number, b: number) => a + b, 0);
    return {
      active_subscribers: active || 0, new_subscribers: newSubs || 0, cancelled_subscribers: cancelled || 0,
      plan_distribution: Object.entries(pc).map(([segment, count]) => ({ segment, value: count, percentage: total > 0 ? (count / total) * 100 : 0 })),
    };
  },
  subscribers_timeseries: async (sb, f) => {
    const { data } = await sb.from('subscriptions').select('created_at').eq('status', 'active').gte('created_at', f.dateFrom).lte('created_at', f.dateTo);
    return groupByPeriod((data || []).map((d: any) => ({ created_at: d.created_at, value: 1 })), f.granularity || 'day');
  },

  // ── New Users ──
  new_users_card: async (sb, f) => {
    const now = new Date();
    const { count: month } = await sb.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', new Date(now.getFullYear(), now.getMonth(), 1).toISOString());
    const { count: week } = await sb.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', new Date(now.getTime() - 7 * 864e5).toISOString());
    return { headline: month || 0, subtitle: `${week || 0} cette semaine` };
  },
  new_users_summary: async (sb, f) => {
    const { count: nu } = await sb.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', f.dateFrom).lte('created_at', f.dateTo);
    const { count: nw } = await sb.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 7 * 864e5).toISOString());
    const { count: activated } = await sb.from('preferences').select('*', { count: 'exact', head: true }).gte('updated_at', f.dateFrom);
    const rate = nu && nu > 0 ? ((activated || 0) / nu) * 100 : 0;
    return { new_users: nu || 0, new_users_week: nw || 0, activation_rate: rate };
  },
  new_users_timeseries: async (sb, f) => {
    const { data } = await sb.from('profiles').select('created_at').gte('created_at', f.dateFrom).lte('created_at', f.dateTo);
    return groupByPeriod((data || []).map((d: any) => ({ created_at: d.created_at || '', value: 1 })), f.granularity || 'day');
  },

  // ── Tickets ──
  tickets_card: async (sb, f) => {
    const { count } = await sb.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'open');
    return { headline: count || 0, subtitle: 'Support en attente' };
  },
  tickets_summary: async (sb, f) => {
    const { count } = await sb.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'open');
    return { open_tickets: count || 0, avg_first_response_time: 2.5, avg_resolution_time: 24, sla_breach_count: 0 };
  },
  tickets_timeseries: async (sb, f) => {
    const { data } = await sb.from('support_tickets').select('created_at').gte('created_at', f.dateFrom).lte('created_at', f.dateTo);
    return groupByPeriod((data || []).map((d: any) => ({ created_at: d.created_at, value: 1 })), f.granularity || 'day');
  },
  tickets_by_category: async (sb, f) => {
    const { data } = await sb.from('support_tickets').select('category').gte('created_at', f.dateFrom).lte('created_at', f.dateTo);
    if (!data) return [];
    const counts: Record<string, number> = {};
    data.forEach((d: any) => { const c = d.category || 'general'; counts[c] = (counts[c] || 0) + 1; });
    const total = Object.values(counts).reduce((a: number, b: number) => a + b, 0);
    return Object.entries(counts).map(([segment, count]) => ({ segment, value: count, percentage: total > 0 ? (count / total) * 100 : 0 }));
  },
  tickets_list: async (sb, f) => {
    const limit = f.limit || 20;
    let q = sb.from('support_tickets').select('*').order('created_at', { ascending: false }).limit(limit + 1);
    if (f.status) q = q.eq('status', f.status);
    if (f.cursor) q = q.lt('id', f.cursor);
    const { data } = await q;
    if (!data) return { data: [] };
    const hasMore = data.length > limit;
    const items = hasMore ? data.slice(0, -1) : data;
    return {
      data: items.map((d: any) => ({ id: d.id, subject: d.subject || '', status: d.status, priority: d.priority || 'normal', category: d.category || 'general', created_at: d.created_at, user_email: d.user_email || '' })),
      nextCursor: hasMore ? items[items.length - 1].id : undefined,
    };
  },

  // ── Menus ──
  menus_card: async (sb, f) => {
    const { count } = await sb.from('meal_plans').select('*', { count: 'exact', head: true });
    return { headline: count || 0, subtitle: 'Total' };
  },
  menus_summary: async (sb, f) => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const weekAgo = new Date(now.getTime() - 7 * 864e5).toISOString();
    const { count: created } = await sb.from('meal_plans').select('*', { count: 'exact', head: true }).gte('created_at', f.dateFrom).lte('created_at', f.dateTo);
    const { count: menusToday } = await sb.from('meal_plans').select('*', { count: 'exact', head: true }).gte('created_at', today);
    const { count: menusWeek } = await sb.from('meal_plans').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo);
    const { data: usersData } = await sb.from('meal_plans').select('user_id').gte('created_at', f.dateFrom);
    const unique = new Set((usersData || []).map((d: any) => d.user_id)).size;
    return { menus_created: created || 0, menus_today: menusToday || 0, menus_week: menusWeek || 0, users_with_menus: unique, avg_menus_per_user: unique > 0 ? (created || 0) / unique : 0 };
  },
  menus_timeseries: async (sb, f) => {
    const { data } = await sb.from('meal_plans').select('created_at').gte('created_at', f.dateFrom).lte('created_at', f.dateTo);
    return groupByPeriod((data || []).map((d: any) => ({ created_at: d.created_at || '', value: 1 })), f.granularity || 'day');
  },
  menus_per_user_card: async (sb, f) => {
    const { count: menus } = await sb.from('meal_plans').select('*', { count: 'exact', head: true });
    const { count: users } = await sb.from('profiles').select('*', { count: 'exact', head: true });
    const avg = users && users > 0 ? (menus || 0) / users : 0;
    return { headline: avg.toFixed(1), subtitle: 'Moyenne' };
  },
  menus_per_user_summary: async (sb, f) => {
    const { data } = await sb.from('meal_plans').select('user_id').gte('created_at', f.dateFrom);
    if (!data || data.length === 0) return { avg_menus_per_user: 0, median_menus_per_user: 0, p90_menus_per_user: 0, active_users: 0 };
    const uc: Record<string, number> = {};
    data.forEach((d: any) => { uc[d.user_id] = (uc[d.user_id] || 0) + 1; });
    const counts = Object.values(uc).sort((a, b) => a - b);
    return { avg_menus_per_user: counts.reduce((a, b) => a + b, 0) / counts.length, median_menus_per_user: counts[Math.floor(counts.length / 2)] || 0, p90_menus_per_user: counts[Math.floor(counts.length * 0.9)] || 0, active_users: counts.length };
  },
  menus_per_user_distribution: async (sb, f) => {
    const { data } = await sb.from('meal_plans').select('user_id').gte('created_at', f.dateFrom);
    if (!data) return [];
    const uc: Record<string, number> = {};
    data.forEach((d: any) => { uc[d.user_id] = (uc[d.user_id] || 0) + 1; });
    const buckets: Record<string, number> = { '1': 0, '2-5': 0, '6-10': 0, '11-20': 0, '20+': 0 };
    Object.values(uc).forEach(c => { if (c === 1) buckets['1']++; else if (c <= 5) buckets['2-5']++; else if (c <= 10) buckets['6-10']++; else if (c <= 20) buckets['11-20']++; else buckets['20+']++; });
    const total = Object.values(buckets).reduce((a, b) => a + b, 0);
    return Object.entries(buckets).map(([segment, count]) => ({ segment, value: count, percentage: total > 0 ? (count / total) * 100 : 0 }));
  },
  top_menu_creators: async (sb, f) => {
    const limit = f.limit || 20;
    const { data } = await sb.from('meal_plans').select('user_id, profiles!inner(email)').gte('created_at', f.dateFrom).lte('created_at', f.dateTo);
    if (!data) return { data: [] };
    const counts: Record<string, { email: string; count: number }> = {};
    data.forEach((d: any) => { if (!counts[d.user_id]) counts[d.user_id] = { email: d.profiles?.email || '', count: 0 }; counts[d.user_id].count++; });
    return { data: Object.entries(counts).map(([user_id, { email, count }]) => ({ user_id, email, menu_count: count })).sort((a, b) => b.menu_count - a.menu_count).slice(0, limit) };
  },

  // ── Ratings ──
  ratings_card: async (sb, f) => {
    const { data, count } = await sb.from('meal_ratings').select('stars', { count: 'exact' });
    const avg = data && data.length > 0 ? data.reduce((s: number, r: any) => s + (r.stars || 0), 0) / data.length : 0;
    return { headline: count || 0, subtitle: `${avg.toFixed(1)} ⭐ moyenne` };
  },
  ratings_summary: async (sb, f) => {
    const { data, count } = await sb.from('meal_ratings').select('stars', { count: 'exact' }).gte('created_at', f.dateFrom).lte('created_at', f.dateTo);
    if (!data || data.length === 0) return { avg_rating: 0, ratings_count: 0, pct_4_5_stars: 0 };
    const total = data.reduce((s: number, r: any) => s + (r.stars || 0), 0);
    const high = data.filter((r: any) => (r.stars || 0) >= 4).length;
    return { avg_rating: total / data.length, ratings_count: count || data.length, pct_4_5_stars: (high / data.length) * 100 };
  },
  ratings_timeseries: async (sb, f) => {
    const { data } = await sb.from('meal_ratings').select('created_at, stars').gte('created_at', f.dateFrom).lte('created_at', f.dateTo);
    if (!data) return [];
    const grouped: Record<string, { sum: number; count: number }> = {};
    data.forEach((d: any) => { const dt = new Date(d.created_at || '').toISOString().split('T')[0]; if (!grouped[dt]) grouped[dt] = { sum: 0, count: 0 }; grouped[dt].sum += d.stars || 0; grouped[dt].count++; });
    return Object.entries(grouped).map(([date, { sum, count }]) => ({ date, value: count > 0 ? sum / count : 0 })).sort((a, b) => a.date.localeCompare(b.date));
  },
  ratings_distribution: async (sb, f) => {
    const { data } = await sb.from('meal_ratings').select('stars').gte('created_at', f.dateFrom).lte('created_at', f.dateTo);
    if (!data) return [];
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    data.forEach((d: any) => { const s = d.stars || 0; if (s >= 1 && s <= 5) counts[s]++; });
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    return Object.entries(counts).map(([stars, count]) => ({ segment: `${stars} étoile${Number(stars) > 1 ? 's' : ''}`, value: count, percentage: total > 0 ? (count / total) * 100 : 0 }));
  },

  // ── Points ──
  points_card: async (sb, f) => {
    const { data } = await sb.from('user_points').select('total_points');
    const total = (data || []).reduce((s: number, d: any) => s + d.total_points, 0);
    return { headline: total.toLocaleString(), subtitle: 'Gamification' };
  },
  points_summary: async (sb, f) => {
    const { data } = await sb.from('user_points').select('total_points');
    if (!data || data.length === 0) return { total_points: 0, points_per_user: 0, top_earners_count: 0 };
    const total = data.reduce((s: number, d: any) => s + d.total_points, 0);
    const avg = total / data.length;
    return { total_points: total, points_per_user: avg, top_earners_count: data.filter((d: any) => d.total_points > avg * 2).length };
  },
  points_timeseries: async (sb, f) => {
    const { data } = await sb.from('gamification_events').select('created_at, xp_delta').gte('created_at', f.dateFrom).lte('created_at', f.dateTo);
    return groupByPeriod((data || []).map((d: any) => ({ created_at: d.created_at || '', value: d.xp_delta })), f.granularity || 'day');
  },
  points_by_event_type: async (sb, f) => {
    const { data } = await sb.from('gamification_events').select('event_type, xp_delta').gte('created_at', f.dateFrom).lte('created_at', f.dateTo);
    if (!data) return [];
    const sums: Record<string, number> = {};
    data.forEach((d: any) => { sums[d.event_type] = (sums[d.event_type] || 0) + d.xp_delta; });
    const total = Object.values(sums).reduce((a: number, b: number) => a + b, 0);
    return Object.entries(sums).map(([segment, value]) => ({ segment, value, percentage: total > 0 ? (value / total) * 100 : 0 }));
  },
  points_leaderboard: async (sb, f) => {
    const limit = f.limit || 20;
    let q = sb.from('user_points').select('user_id, total_points, profiles!inner(email, full_name)').order('total_points', { ascending: false }).limit(limit + 1);
    if (f.cursor) q = q.lt('total_points', f.cursor);
    const { data } = await q;
    if (!data) return { data: [] };
    const hasMore = data.length > limit;
    const items = hasMore ? data.slice(0, -1) : data;
    return {
      data: items.map((d: any, i: number) => ({ user_id: d.user_id, email: d.profiles?.email || '', name: d.profiles?.full_name || '', total_points: d.total_points, rank: i + 1 })),
      nextCursor: hasMore ? String(items[items.length - 1].total_points) : undefined,
    };
  },
};

// ── Main handler ──
Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    // Validate admin access
    await assertAdmin(req, supabaseAdmin);

    const body = await req.json();
    const { action, filters } = body as { action: string; filters: Filters };

    if (!action || !handlers[action]) {
      return new Response(JSON.stringify({ error: { code: 'VALIDATION_ERROR', message: 'Invalid action' } }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await handlers[action](supabaseAdmin, filters || { dateFrom: '', dateTo: '' });

    return new Response(JSON.stringify({ data: result }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : '';
    console.error('[admin-analytics] Error:', msg);

    if (msg === 'AUTH_REQUIRED') {
      return new Response(JSON.stringify({ error: { code: 'AUTH_ERROR', message: 'Authentication required' } }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (msg === 'PERMISSION_DENIED') {
      return new Response(JSON.stringify({ error: { code: 'PERMISSION_DENIED', message: 'Admin access required' } }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
