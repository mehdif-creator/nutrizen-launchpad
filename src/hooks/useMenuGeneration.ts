import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { t } from '@/i18n/translations';

/**
 * Hook for generating weekly menus with proper error handling and loading states
 * Implements idempotent menu generation - safe to call multiple times
 */
export function useMenuGeneration() {
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  /**
   * Generate menu for the current week
   * Returns the generated menu or null if generation fails
   */
  const generateMenu = async (): Promise<boolean> => {
    setGenerating(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      
      if (!session.session) {
        throw new Error('No active session');
      }

      const { data, error } = await supabase.functions.invoke('generate-menu', {
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
        },
      });

      if (error) {
        console.error('[useMenuGeneration] Error:', error);
        throw error;
      }

      console.log('[useMenuGeneration] Menu generated:', data);

      toast({
        title: t('menu.generated'),
        description: t('menu.generatedDesc'),
      });

      return true;
    } catch (error) {
      console.error('[useMenuGeneration] Failed to generate menu:', error);
      
      toast({
        title: t('menu.error'),
        description: t('menu.errorDesc'),
        variant: 'destructive',
      });

      return false;
    } finally {
      setGenerating(false);
    }
  };

  return {
    generating,
    generateMenu,
  };
}
