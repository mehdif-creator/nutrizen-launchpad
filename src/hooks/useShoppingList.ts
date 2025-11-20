import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ShoppingListItem {
  ingredient_name: string;
  total_quantity: number;
  unit: string;
  formatted_display: string;
}

/**
 * Hook to fetch normalized shopping list for current week
 * Aggregates ingredients by name + unit with proper quantity summing
 */
export function useShoppingList(userId: string | undefined) {
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    const fetchShoppingList = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const { data, error: rpcError } = await supabase.rpc(
          'get_shopping_list_from_weekly_menu',
          {
            p_user_id: userId,
            p_week_start: null, // null = current week
          }
        );

        if (rpcError) {
          throw rpcError;
        }

        setItems(data || []);
      } catch (err) {
        console.error('[useShoppingList] Error fetching shopping list:', err);
        setError(err as Error);
        setItems([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchShoppingList();
  }, [userId]);

  return {
    items,
    isLoading,
    error,
    hasItems: items.length > 0,
  };
}
