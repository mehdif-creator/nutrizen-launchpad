import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface EffectivePortions {
  effective_servings_per_meal: number;
  rounded_servings: number;
  servings_breakdown: {
    adults: number;
    children: number;
    kid_portion_ratio: number;
  };
  portion_strategy: string;
  profile_complete: boolean;
}

/**
 * Hook to get effective portions based on user profile.
 * Single source of truth for portion calculations.
 */
export function useEffectivePortions(userId: string | undefined) {
  return useQuery({
    queryKey: ['effectivePortions', userId],
    queryFn: async (): Promise<EffectivePortions> => {
      if (!userId) {
        return {
          effective_servings_per_meal: 2,
          rounded_servings: 2,
          servings_breakdown: { adults: 1, children: 0, kid_portion_ratio: 0.6 },
          portion_strategy: 'household',
          profile_complete: false,
        };
      }

      const { data, error } = await supabase.rpc('rpc_get_effective_portions', {
        p_user_id: userId,
        p_week_start: null,
      });

      if (error) {
        console.error('[useEffectivePortions] Error:', error);
        throw error;
      }

      // Cast the JSONB response to our interface
      const result = data as unknown as EffectivePortions;
      
      return {
        effective_servings_per_meal: result.effective_servings_per_meal || 2,
        rounded_servings: result.rounded_servings || 2,
        servings_breakdown: result.servings_breakdown || { adults: 1, children: 0, kid_portion_ratio: 0.6 },
        portion_strategy: result.portion_strategy || 'household',
        profile_complete: result.profile_complete || false,
      };
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
