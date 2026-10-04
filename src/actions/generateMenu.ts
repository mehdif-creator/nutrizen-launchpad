import { supabase } from '@/integrations/supabase/client';
import { queryClient } from '@/lib/queryClient';
import { createLogger } from '@/lib/logger';
import { completeMenuRequest, menuRequestId } from '@/lib/menuRequests';
import { getCurrentWeekStart } from '@/hooks/useWeeklyMenu';

const logger = createLogger('generateMenu');

export interface GenerateMenuResult {
  success: boolean;
  message?: string;
  error_code?: string;
  menu_id?: string;
  usedFallback?: boolean;
  fallbackLevel?: number;
  days?: Record<string, unknown>[];
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

    logger.info('Calling generate-menu edge function');

    const userId = session.session.user.id;
    const week = getCurrentWeekStart();
    // Reuse the request after a lost response, including across entry points.
    const { data, error } = await supabase.functions.invoke('generate-menu', {
      body: { week_start: week, request_id: menuRequestId(userId, 'generate', week) },
      headers: {
        Authorization: `Bearer ${session.session.access_token}`,
      },
    });

    if (error) {
      logger.error('Edge function error', error);
      try {
        const body = await error.context?.json?.();
        if (body)
          return {
            success: false,
            message: body.message || body.error,
            error_code: body.error_code,
          };
      } catch {
        /* Keep the original transport error if no JSON response exists. */
      }
      throw error;
    }

    if (!data?.success)
      return {
        success: false,
        message: data?.message || 'La génération n’a pas été confirmée.',
        error_code: data?.error_code,
      };
    completeMenuRequest(userId, 'generate', week);

    logger.debug('Success', { data });

    // Invalidate weekly menu query to refetch
    if (session.session.user?.id) {
      await queryClient.invalidateQueries({
        queryKey: ['weeklyMenu', session.session.user.id],
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['weeklyRecipesByDay', userId] }),
        queryClient.invalidateQueries({ queryKey: ['shoppingList'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboardStats'] }),
      ]);
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
    logger.error('Error', error instanceof Error ? error : new Error(String(error)));
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
    toastTitle: result.success ? 'Menus générés avec succès' : 'Génération impossible',
    toastDescription: result.success
      ? undefined
      : result.message || 'Impossible de générer un menu. Réessaie plus tard.',
    toastVariant: result.success ? 'default' : ('destructive' as const),
  };
}
