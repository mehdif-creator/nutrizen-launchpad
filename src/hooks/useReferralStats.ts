import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ReferralStats {
  has_code: boolean;
  referral_code: string | null;
  clicks: number;
  signups: number;
  qualified: number;
  rewards: number;
  total_credits_earned: number;
}

export function useReferralStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['referral-stats', user?.id],
    queryFn: async (): Promise<ReferralStats> => {
      if (!user) {
        throw new Error('Non authentifié');
      }

      const { data, error } = await supabase.rpc('rpc_get_referral_stats', {
        p_user_id: user.id,
      });

      if (error) {
        console.error('[useReferralStats] Error:', error);
        throw error;
      }

      return data as unknown as ReferralStats;
    },
    enabled: !!user,
    staleTime: 30000, // 30 seconds
  });
}
