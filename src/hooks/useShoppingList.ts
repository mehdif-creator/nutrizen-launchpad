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
      // 1. Try the RPC (works for DB-backed menus)
      const { data, error } = await supabase.rpc(
        'get_shopping_list_from_weekly_menu',
        { p_user_id: userId!, p_week_start: null }
      );
      if (error) {
        logger.error('Error fetching shopping list', error);
        throw error;
      }

      if (data && data.length > 0) {
        return (data as ShoppingListItem[]) || [];
      }

      // 2. Fallback: extract from AI menu payload
      const now = new Date();
      const dayOfWeek = now.getUTCDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const weekStartDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diff));
      const weekStart = weekStartDate.toISOString().split('T')[0];

      const { data: menuData } = await supabase
        .from('user_weekly_menus')
        .select('payload')
        .eq('user_id', userId!)
        .eq('week_start', weekStart)
        .maybeSingle();

      const payload = menuData?.payload as any;
      if (payload?.ai_generated && payload?.days) {
        const items: ShoppingListItem[] = [];
        for (const day of payload.days) {
          for (const meal of [day.lunch, day.dinner]) {
            if (!meal?.ingredients) continue;
            for (const ing of meal.ingredients) {
              const qty = parseFloat(ing.quantite) || 0;
              const unit = ing.unite || '';
              const name = ing.nom || '';
              if (!name) continue;
              items.push({
                ingredient_name: name,
                total_quantity: qty,
                unit,
                formatted_display: qty > 0 ? `${qty} ${unit} ${name}`.trim() : name,
              });
            }
          }
        }
        return items;
      }

      return [];
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
