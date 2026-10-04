import { useState, useCallback } from 'react';
import { generateMenuForUser } from '@/actions/generateMenu';

export interface MenuGenerationState {
  status: 'idle' | 'generating' | 'success' | 'error';
  errorMessage?: string;
  menuId?: string;
}

/** Share validation, request IDs and error handling with other generation entry points. */
export function useAutoMenuGeneration() {
  const [state, setState] = useState<MenuGenerationState>({ status: 'idle' });
  const generateMenu = useCallback(async (): Promise<boolean> => {
    setState({ status: 'generating' });
    const result = await generateMenuForUser();
    setState(
      result.success
        ? { status: 'success', menuId: result.menu_id }
        : {
            status: 'error',
            errorMessage: result.message || 'La génération n’a pas été confirmée.',
          }
    );
    return result.success;
  }, []);
  const reset = useCallback(() => setState({ status: 'idle' }), []);
  return { ...state, generateMenu, reset };
}
