import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useRecipesGallery = () => {
  return useQuery({
    queryKey: ['recipes-gallery'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recipes')
        .select('id, title, image_url, image_path')
        .eq('published', true)
        .not('image_url', 'is', null)
        .limit(20);

      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
