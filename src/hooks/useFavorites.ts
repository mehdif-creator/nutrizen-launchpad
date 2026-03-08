import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useFavorites() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: favoriteIds = [], isLoading } = useQuery({
    queryKey: ['favorites', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('recipe_favorites')
        .select('recipe_id')
        .eq('user_id', user.id);
      if (error) throw error;
      return data.map((f: any) => f.recipe_id as string);
    },
    enabled: !!user,
  });

  const toggleFavorite = useMutation({
    mutationFn: async (recipeId: string) => {
      if (!user) throw new Error('Non connecté');
      const isFav = favoriteIds.includes(recipeId);
      if (isFav) {
        const { error } = await supabase
          .from('recipe_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('recipe_id', recipeId);
        if (error) throw error;
        return { added: false };
      } else {
        const { error } = await supabase
          .from('recipe_favorites')
          .insert({ user_id: user.id, recipe_id: recipeId });
        if (error) throw error;
        return { added: true };
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['favorites', user?.id] });
      if (result.added) {
        toast('Recette ajoutée aux favoris ❤️');
      } else {
        toast('Recette retirée des favoris');
      }
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour des favoris');
    },
  });

  return {
    favoriteIds,
    isLoading,
    isFavorite: (recipeId: string) => favoriteIds.includes(recipeId),
    toggleFavorite: (recipeId: string) => toggleFavorite.mutate(recipeId),
    isToggling: toggleFavorite.isPending,
  };
}
