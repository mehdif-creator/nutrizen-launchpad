import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { createLogger } from '@/lib/logger';

const logger = createLogger('GamificationV2');

// ─── Types ───────────────────────────────────────────────────────
export interface GamificationState {
  total_points: number;
  level: number;
  streak_days: number;
  last_activity_date: string | null;
}

export interface PointRule {
  event_type: string;
  points: number;
  label_fr: string;
  max_per_day: number | null;
  active: boolean;
}

export interface LevelInfo {
  level: number;
  min_points: number;
  name_fr: string;
}

interface EmitResult {
  success: boolean;
  points_awarded?: number;
  total_points?: number;
  level?: number;
  level_name?: string;
  streak_days?: number;
  label?: string;
  error?: string;
  duplicate?: boolean;
}

const DEFAULT_STATE: GamificationState = {
  total_points: 0,
  level: 1,
  streak_days: 0,
  last_activity_date: null,
};

// ─── Read state ──────────────────────────────────────────────────
export function useGamificationState() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['gamification-state', user?.id],
    queryFn: async (): Promise<GamificationState> => {
      const { data, error } = await supabase
        .from('user_gamification_state')
        .select('total_points, level, streak_days, last_activity_date')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (error) throw error;
      return data ?? DEFAULT_STATE;
    },
    enabled: !!user,
    staleTime: 30_000,
    placeholderData: DEFAULT_STATE,
  });

  // Realtime subscription for instant updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`gam-state-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_gamification_state',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['gamification-state', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return query;
}

// ─── Read levels (static, cached long) ───────────────────────────
export function useLevels() {
  return useQuery({
    queryKey: ['gamification-levels'],
    queryFn: async (): Promise<LevelInfo[]> => {
      const { data, error } = await supabase
        .from('gamification_levels')
        .select('level, min_points, name_fr')
        .order('level', { ascending: true });

      if (error) throw error;
      return (data ?? []) as LevelInfo[];
    },
    staleTime: Infinity,
  });
}

// ─── Read point rules ────────────────────────────────────────────
export function usePointRules() {
  return useQuery({
    queryKey: ['gamification-point-rules'],
    queryFn: async (): Promise<PointRule[]> => {
      const { data, error } = await supabase
        .from('gamification_point_rules')
        .select('event_type, points, label_fr, max_per_day, active')
        .eq('active', true);

      if (error) throw error;
      return (data ?? []) as PointRule[];
    },
    staleTime: 5 * 60_000,
  });
}

// ─── Recent events (activity feed) ──────────────────────────────
export function useRecentGamificationEvents(limit = 20) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['gamification-events', user?.id, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gamification_events')
        .select('id, event_type, xp_delta, metadata, created_at')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
    staleTime: 30_000,
  });
}

// ─── Emit event (atomic RPC) ────────────────────────────────────
export function useEmitGamificationEvent() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      eventType,
      meta = {},
      idempotencyKey,
    }: {
      eventType: string;
      meta?: Record<string, unknown>;
      idempotencyKey?: string;
    }): Promise<EmitResult> => {
      const { data, error } = await (supabase.rpc as Function)(
        'fn_emit_gamification_event',
        {
          p_event_type: eventType,
          p_meta: meta,
          p_idempotency_key: idempotencyKey ?? null,
        }
      );

      if (error) throw error;
      return data as EmitResult;
    },
    onSuccess: (result) => {
      if (result.success && result.label) {
        toast.success(`+${result.points_awarded} pts — ${result.label}`, {
          duration: 3000,
        });
      }
      // Always invalidate to refresh state
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: ['gamification-state', user.id] });
        queryClient.invalidateQueries({ queryKey: ['gamification-events', user.id] });
        queryClient.invalidateQueries({ queryKey: ['gamification-dashboard'] });
      }
    },
    onError: (error) => {
      logger.error('Failed to emit gamification event', error);
    },
  });
}

// ─── Convenience hooks ──────────────────────────────────────────
export function useEmitAppOpen() {
  const { user } = useAuth();
  const emit = useEmitGamificationEvent();

  return useCallback(() => {
    if (!user?.id) return;
    // Use Europe/Paris date for idempotency key
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' });
    emit.mutate({
      eventType: 'APP_OPEN',
      idempotencyKey: `app_open:${user.id}:${today}`,
    });
  }, [user?.id, emit]);
}

// ─── Helpers ─────────────────────────────────────────────────────
export function getLevelName(level: number, levels: LevelInfo[]): string {
  return levels.find((l) => l.level === level)?.name_fr ?? `Niveau ${level}`;
}

export function getNextLevelThreshold(
  currentLevel: number,
  levels: LevelInfo[]
): number {
  const next = levels.find((l) => l.level === currentLevel + 1);
  return next?.min_points ?? (levels[levels.length - 1]?.min_points ?? 0) + 500;
}

export function getCurrentLevelThreshold(
  currentLevel: number,
  levels: LevelInfo[]
): number {
  return levels.find((l) => l.level === currentLevel)?.min_points ?? 0;
}
