import { useCallback, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { broadcastAdminInvalidate } from '@/lib/adminLive';

export interface AdminDashboardStats {
  financial: {
    mrr: number | null;
    arpu: number | null;
    trialToPaidConversionRate: number | null;
    churnRate: number | null;
    cancellationsCount: number | null;
  };
  users: {
    totalUsers: number | null;
    activeSubscribers: number | null;
    trialUsers: number | null;
    trialUsersStripe?: number | null;
    trialUsersImplicit?: number | null;
    newUsersThisMonth: number | null;
    newUsersThisWeek: number | null;
    openTickets: number | null;
  };
  engagement: {
    totalMenusCreated: number | null;
    menusPerUserAvg: number | null;
    ratingsCount: number | null;
    ratingsAvg: number | null;
    totalPoints: number | null;
  };
  updatedAt: string;
}

const POLL_MS = 45_000;

async function fetchDashboardStats(): Promise<AdminDashboardStats> {
  const { data, error } = await supabase.rpc('rpc_admin_dashboard_stats' as any);
  if (error) throw error;
  return data as unknown as AdminDashboardStats;
}

/**
 * Centralized admin dashboard stats hook.
 *
 * Uses TanStack Query so it benefits from the global refetchOnWindowFocus +
 * refetchOnReconnect config and the AdminLiveListener invalidation layer
 * (route change, cross-tab broadcast, manual refresh).
 *
 * Also subscribes to Supabase Realtime on the KPI source tables; every change
 * triggers a cross-tab broadcast so all open admin tabs revalidate together.
 */
export function useAdminDashboardStats() {
  const qc = useQueryClient();
  const lastBroadcast = useRef(0);

  const query = useQuery({
    queryKey: ['admin', 'dashboard-stats'],
    queryFn: fetchDashboardStats,
    refetchInterval: POLL_MS,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 15_000,
  });

  useEffect(() => {
    const onRealtime = () => {
      // Throttle realtime fan-out to one broadcast per second.
      const now = Date.now();
      if (now - lastBroadcast.current < 1000) return;
      lastBroadcast.current = now;
      broadcastAdminInvalidate('realtime:dashboard');
    };

    const channel = supabase
      .channel('admin_dashboard_stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meal_plans' }, onRealtime)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meal_ratings' }, onRealtime)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, onRealtime)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, onRealtime)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_points' }, onRealtime)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const refresh = useCallback(async () => {
    broadcastAdminInvalidate('manual:refresh');
    await qc.invalidateQueries({ queryKey: ['admin', 'dashboard-stats'] });
    await query.refetch();
  }, [qc, query]);

  return {
    data: query.data ?? null,
    loading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error ? (query.error as Error).message : null,
    refresh,
  };
}

// Formatting helpers (French locale)
export const fmtEUR = (v: number | null | undefined) =>
  v == null
    ? '—'
    : new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(v);

export const fmtPct = (v: number | null | undefined, digits = 1) =>
  v == null ? '—' : `${v.toFixed(digits).replace('.', ',')} %`;

export const fmtNum = (v: number | null | undefined) =>
  v == null ? '—' : new Intl.NumberFormat('fr-FR').format(v);

export const fmtDec = (v: number | null | undefined, digits = 1) =>
  v == null ? '—' : v.toFixed(digits).replace('.', ',');
