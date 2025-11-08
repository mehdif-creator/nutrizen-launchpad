import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { toast } from 'sonner';

export interface DashboardData {
  wallet: {
    user_id: string;
    points_total: number;
    credits_total: number;
    lifetime_points: number;
    lifetime_credits_earned: number;
    updated_at: string;
  };
  streak: {
    user_id: string;
    current_streak_days: number;
    longest_streak_days: number;
    last_active_date: string | null;
    updated_at: string;
  };
  profile: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    referral_code: string;
    show_on_leaderboard: boolean;
  };
  badges: Array<{
    code: string;
    grantedAt: string;
    name: string;
    description: string;
    icon: string;
  }>;
  recentEvents: Array<{
    type: string;
    points: number;
    credits: number;
    at: string;
    meta: Record<string, any>;
  }>;
  activeReferrals: number;
}

// Fetch dashboard data
export function useDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['gamification-dashboard', user?.id],
    queryFn: async (): Promise<DashboardData> => {
      const { data, error } = await supabase.rpc('fn_get_dashboard');
      if (error) throw error;
      return data as unknown as DashboardData;
    },
    enabled: !!user,
    staleTime: 30000, // 30 seconds
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`user-events-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_events',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['gamification-dashboard'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return query;
}

// Award app open
export function useAwardAppOpen() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('award-app-open');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.success && !data.alreadyAwarded) {
        toast.success(data.message);
        queryClient.invalidateQueries({ queryKey: ['gamification-dashboard'] });
      }
    },
  });
}

// Record meal validated
export function useMealValidated() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { recipeId: string; durationMinutes?: number; dayCompleted?: boolean }) => {
      const { data, error } = await supabase.functions.invoke('meal-validated', {
        body: params,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.success) {
        data.messages.forEach((msg: string) => toast.success(msg));
        queryClient.invalidateQueries({ queryKey: ['gamification-dashboard'] });
      }
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });
}

// Complete weekly challenge
export function useCompleteChallenge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('weekly-challenge-complete');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message, { duration: 5000 });
        queryClient.invalidateQueries({ queryKey: ['gamification-dashboard'] });
      } else {
        toast.info(data.message);
      }
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });
}

// Record social share
export function useSocialShare() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (platform: 'twitter' | 'facebook' | 'instagram') => {
      const { data, error } = await supabase.functions.invoke('social-share', {
        body: { platform },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message);
        queryClient.invalidateQueries({ queryKey: ['gamification-dashboard'] });
      } else {
        toast.info(data.message);
      }
    },
  });
}

// Convert points to credits
export function usePointsToCredits() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (points: number) => {
      const { data, error } = await supabase.rpc('fn_points_to_credits', {
        p_points: points,
      });
      if (error) throw error;
      if (!data) throw new Error('Insufficient points or invalid amount');
      return data;
    },
    onSuccess: () => {
      toast.success('Points converted to credits!');
      queryClient.invalidateQueries({ queryKey: ['gamification-dashboard'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to convert points');
    },
  });
}

// Consume credit
export function useConsumeCredit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (count: number = 1) => {
      const { data, error } = await supabase.rpc('fn_consume_credit', {
        p_count: count,
      });
      if (error) throw error;
      if (!data) throw new Error('Insufficient credits');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gamification-dashboard'] });
    },
    onError: (error: any) => {
      toast.error(error.message === 'insufficient_credits' 
        ? 'Pas assez de crédits! Convertissez vos points ou achetez des crédits.'
        : 'Failed to use credit');
    },
  });
}

// Get current weekly challenge
export function useWeeklyChallenge() {
  return useQuery({
    queryKey: ['weekly-challenge'],
    queryFn: async () => {
      // Calculate this week's Monday (Europe/Paris)
      const now = new Date();
      const parisDate = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
      const dayOfWeek = parisDate.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(parisDate);
      monday.setDate(parisDate.getDate() + mondayOffset);
      const weekStart = monday.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('weekly_challenges')
        .select('*')
        .eq('week_start', weekStart)
        .single();

      if (error) throw error;
      return data;
    },
    staleTime: 3600000, // 1 hour
  });
}