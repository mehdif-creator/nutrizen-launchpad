import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
const THROTTLE_MS = 1_500;

export function useAdminDashboardStats() {
  const [data, setData] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const lastFetch = useRef(0);
  const pendingTimer = useRef<number | null>(null);

  const fetchNow = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const { data: res, error: err } = await supabase.rpc('rpc_admin_dashboard_stats' as any);
      if (err) throw err;
      setData(res as unknown as AdminDashboardStats);
      setError(null);
      lastFetch.current = Date.now();
    } catch (e: any) {
      setError(e?.message ?? 'unknown_error');
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(() => {
    const since = Date.now() - lastFetch.current;
    if (since >= THROTTLE_MS) {
      fetchNow();
      return;
    }
    if (pendingTimer.current) return;
    pendingTimer.current = window.setTimeout(() => {
      pendingTimer.current = null;
      fetchNow();
    }, THROTTLE_MS - since);
  }, [fetchNow]);

  useEffect(() => {
    fetchNow();

    const poll = window.setInterval(fetchNow, POLL_MS);
    const onFocus = () => refresh();
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);

    const channel = supabase
      .channel('admin_dashboard_stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meal_plans' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meal_ratings' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_points' }, refresh)
      .subscribe();

    return () => {
      window.clearInterval(poll);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
      if (pendingTimer.current) window.clearTimeout(pendingTimer.current);
      supabase.removeChannel(channel);
    };
  }, [fetchNow, refresh]);

  return { data, loading, error, refresh: fetchNow };
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
