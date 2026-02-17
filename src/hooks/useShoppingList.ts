import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { createLogger } from '@/lib/logger';

const logger = createLogger('useShoppingList');

export interface ShoppingListItem {
  ingredient_name: string;
  total_quantity: number;
  unit: string;
  formatted_display: string;
}

export function useShoppingList(userId: string | undefined) {
  const query = useQuery({
    queryKey: ['shoppingList', userId],
    queryFn: async (): Promise<ShoppingListItem[]> => {
      const { data, error } = await supabase.rpc(
        'get_shopping_list_from_weekly_menu',
        { p_user_id: userId!, p_week_start: null }
      );
      if (error) {
        logger.error('Error fetching shopping list', error);
        throw error;
      }
      return (data as ShoppingListItem[]) || [];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  return {
    items: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    hasItems: (query.data?.length ?? 0) > 0,
  };
}
