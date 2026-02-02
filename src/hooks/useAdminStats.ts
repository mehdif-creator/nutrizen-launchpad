import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ReferralFunnelStats {
  total_clicks: number;
  total_signups: number;
  total_qualified: number;
  total_rewards: number;
  conversion_click_to_signup: number;
  conversion_signup_to_qualified: number;
}

export interface ConversionFunnelStats {
  signups: number;
  onboarding_completed: number;
  first_menu_generated: number;
  first_credit_purchase: number;
  conversion_signup_to_onboarding: number;
  conversion_onboarding_to_menu: number;
}

export function useAdminReferralFunnel(dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ['admin-referral-funnel', dateFrom, dateTo],
    queryFn: async (): Promise<ReferralFunnelStats> => {
      const { data, error } = await supabase.rpc('rpc_admin_referral_funnel', {
        p_date_from: dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        p_date_to: dateTo || new Date().toISOString().split('T')[0],
      });

      if (error) {
        console.error('[useAdminReferralFunnel] Error:', error);
        throw error;
      }

      return data as unknown as ReferralFunnelStats;
    },
    staleTime: 60000, // 1 minute
  });
}

export function useAdminConversionFunnel(dateFrom?: string, dateTo?: string) {
  return useQuery({
    queryKey: ['admin-conversion-funnel', dateFrom, dateTo],
    queryFn: async (): Promise<ConversionFunnelStats> => {
      const { data, error } = await supabase.rpc('rpc_admin_conversion_funnel', {
        p_date_from: dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        p_date_to: dateTo || new Date().toISOString().split('T')[0],
      });

      if (error) {
        console.error('[useAdminConversionFunnel] Error:', error);
        throw error;
      }

      return data as unknown as ConversionFunnelStats;
    },
    staleTime: 60000, // 1 minute
  });
}
