import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface DailyRecipes {
  lunch: any;
  dinner: any;
}

export function useDailyRecipes(date: Date = new Date()) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['daily-recipes', user?.id, date.toISOString().split('T')[0]],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase.rpc('get_daily_recipe_suggestions', {
        p_user_id: user.id,
        p_date: date.toISOString().split('T')[0],
      });
      
      if (error) throw error;
      return data as unknown as DailyRecipes;
    },
    enabled: !!user,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });
}
