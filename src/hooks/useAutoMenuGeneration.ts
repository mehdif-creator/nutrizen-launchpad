import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { queryClient } from '@/lib/queryClient';
import { createLogger } from '@/lib/logger';

const logger = createLogger('useAutoMenuGeneration');

export interface MenuGenerationState {
  status: 'idle' | 'generating' | 'success' | 'error';
  errorMessage?: string;
  menuId?: string;
}

/**
 * Hook for automatic menu generation after profile completion
 * Handles the async generation with proper state management
 */
export function useAutoMenuGeneration() {
  const [state, setState] = useState<MenuGenerationState>({ status: 'idle' });

  const generateMenu = useCallback(async (): Promise<boolean> => {
    setState({ status: 'generating' });

    try {
      const { data: session } = await supabase.auth.getSession();
      
      if (!session.session) {
        setState({ 
          status: 'error', 
          errorMessage: 'Session expirée. Veuillez vous reconnecter.' 
        });
        return false;
      }

      logger.info('Starting menu generation...');

      const { data, error } = await supabase.functions.invoke('generate-menu', {
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
        },
      });

      if (error) {
        logger.error('Error', error);
        setState({ 
          status: 'error', 
          errorMessage: error.message || 'Erreur lors de la génération du menu.' 
        });
        return false;
      }

      if (data?.success === false) {
        logger.error('Generation failed', new Error(data.message));
        setState({ 
          status: 'error', 
          errorMessage: data.message || 'Impossible de générer un menu avec vos préférences.' 
        });
        return false;
      }

      logger.debug('Success', { data });

      // Invalidate queries to refresh data
      if (session.session.user?.id) {
        await queryClient.invalidateQueries({ 
          queryKey: ['weeklyMenu', session.session.user.id] 
        });
        await queryClient.invalidateQueries({ 
          queryKey: ['dashboardStats'] 
        });
      }

      setState({ 
        status: 'success', 
        menuId: data.menu_id 
      });
      
      return true;
    } catch (error) {
      logger.error('Exception', error instanceof Error ? error : new Error(String(error)));
      setState({ 
        status: 'error', 
        errorMessage: error instanceof Error ? error.message : 'Une erreur inattendue est survenue.' 
      });
      return false;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ status: 'idle' });
  }, []);

  return {
    ...state,
    generateMenu,
    reset,
  };
}
