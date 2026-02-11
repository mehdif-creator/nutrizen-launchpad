import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { t } from '@/i18n/translations';
import { queryClient } from '@/lib/queryClient';

export interface MenuGenerationResult {
  success: boolean;
  errorType?: 'NO_SAFE_RECIPES' | 'SAFETY_VALIDATION_FAILED' | 'NO_RECIPES_IN_DB' | 'UNKNOWN';
  restrictions?: string[];
  message?: string;
}

/**
 * Hook for generating weekly menus with proper error handling and loading states
 * Implements idempotent menu generation - safe to call multiple times
 * Now includes safety gate error handling for allergen violations
 */
export function useMenuGeneration() {
  const [generating, setGenerating] = useState(false);
  const [lastError, setLastError] = useState<MenuGenerationResult | null>(null);
  const { toast } = useToast();

  /**
   * Generate menu for the current week
   * Returns detailed result including safety gate errors
   */
  const generateMenu = async (): Promise<MenuGenerationResult> => {
    setGenerating(true);
    setLastError(null);

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

      console.log('[useMenuGeneration] Response:', data);

      // Check for safety gate errors
      if (data.success === false) {
        const errorResult: MenuGenerationResult = {
          success: false,
          errorType: data.error || 'UNKNOWN',
          restrictions: data.restrictions || [],
          message: data.message,
        };
        
        setLastError(errorResult);
        
        // Show appropriate toast based on error type
        if (data.error === 'NO_SAFE_RECIPES') {
          toast({
            title: 'Aucune recette compatible',
            description: 'Modifie tes préférences pour élargir les options.',
            variant: 'destructive',
          });
        } else if (data.error === 'SAFETY_VALIDATION_FAILED') {
          toast({
            title: 'Problème de sécurité',
            description: 'Certaines recettes contenaient des aliments interdits.',
            variant: 'destructive',
          });
        } else {
          toast({
            title: t('menu.error'),
            description: data.message || t('menu.errorDesc'),
            variant: 'destructive',
          });
        }
        
        return errorResult;
      }

      // Invalidate all dashboard queries for immediate reactivity
      queryClient.invalidateQueries({ queryKey: ['weeklyMenu'] });
      queryClient.invalidateQueries({ queryKey: ['weeklyRecipesByDay'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['userDashboard'] });
      queryClient.invalidateQueries({ queryKey: ['shoppingList'] });

      toast({
        title: t('menu.generated'),
        description: t('menu.generatedDesc'),
      });

      return { success: true };
    } catch (error) {
      console.error('[useMenuGeneration] Failed to generate menu:', error);
      
      const errorResult: MenuGenerationResult = {
        success: false,
        errorType: 'UNKNOWN',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
      
      setLastError(errorResult);
      
      toast({
        title: t('menu.error'),
        description: t('menu.errorDesc'),
        variant: 'destructive',
      });

      return errorResult;
    } finally {
      setGenerating(false);
    }
  };

  const clearError = () => setLastError(null);

  return {
    generating,
    generateMenu,
    lastError,
    clearError,
  };
}
