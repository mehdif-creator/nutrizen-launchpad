import { supabase } from '@/integrations/supabase/client';
import { queryClient } from '@/lib/queryClient';

export interface GenerateMenuResult {
  success: boolean;
  message?: string;
  menu_id?: string;
  usedFallback?: boolean;
  fallbackLevel?: number;
  days?: any[];
}

/**
 * Generate weekly menu for user
 * Calls Edge Function and invalidates queries
 */
export async function generateMenuForUser(): Promise<GenerateMenuResult> {
  try {
    // Get current session
    const { data: session } = await supabase.auth.getSession();
    
    if (!session.session) {
      throw new Error('No active session');
    }

    console.log('[generateMenu] Calling generate-menu edge function');

    // Call Edge Function
    const { data, error } = await supabase.functions.invoke('generate-menu', {
      headers: {
        Authorization: `Bearer ${session.session.access_token}`,
      },
    });

    if (error) {
      console.error('[generateMenu] Edge function error:', error);
      throw error;
    }

    console.log('[generateMenu] Success:', data);

    // Invalidate weekly menu query to refetch
    if (session.session.user?.id) {
      await queryClient.invalidateQueries({ 
        queryKey: ['weeklyMenu', session.session.user.id] 
      });
    }

    return {
      success: data.success ?? false,
      message: data.message,
      menu_id: data.menu_id,
      usedFallback: data.usedFallback ?? false,
      fallbackLevel: data.fallbackLevel,
      days: data.days,
    };
  } catch (error) {
    console.error('[generateMenu] Error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Generate menu and return result with user feedback
 */
export async function generateMenuWithToast() {
  const result = await generateMenuForUser();
  
  return {
    ...result,
      toastTitle: result.success 
        ? '✅ Semaine régénérée !' 
        : '⚠️ Génération impossible',
      toastDescription: result.success
        ? (result.usedFallback 
            ? `Menu généré avec ${result.usedFallback} (allergies respectées).`
            : 'Voici 7 nouveaux repas personnalisés pour toi.')
        : (result.message || 'Impossible de générer un menu. Réessaie plus tard.'),
      toastVariant: result.success ? 'default' : ('destructive' as const),
  };
}
