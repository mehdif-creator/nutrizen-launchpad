import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface OnboardingStatus {
  completed: boolean;
  version: number;
  completedAt: string | null;
  loading: boolean;
}

/**
 * Hook to guard routes based on onboarding status.
 * Uses server-side truth: onboarding_completed_at + onboarding_version.
 * Redirects to /app/onboarding if not completed.
 */
export function useOnboardingGuard(userId: string | undefined) {
  const [state, setState] = useState<OnboardingStatus>({
    completed: false,
    version: 0,
    completedAt: null,
    loading: true,
  });
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  // Prevent redirect loops with a ref
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (!userId) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    const fetchOnboardingStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('onboarding_completed_at, onboarding_version')
          .eq('id', userId)
          .single();

        if (error) {
          console.error('[useOnboardingGuard] Error fetching profile:', error);
          // If profile doesn't exist, user needs onboarding
          if (error.code === 'PGRST116') {
            setState({
              completed: false,
              version: 0,
              completedAt: null,
              loading: false,
            });
          } else {
            // Other error - log but don't block
            toast({
              variant: 'destructive',
              title: 'Erreur',
              description: 'Impossible de vérifier le statut du profil.',
            });
            setState(prev => ({ ...prev, loading: false }));
          }
          return;
        }

        // Server truth: completed if onboarding_completed_at is set AND version is 1
        const completedAt = data?.onboarding_completed_at;
        const version = data?.onboarding_version ?? 0;
        const isCompleted = completedAt !== null && version === 1;

        setState({
          completed: isCompleted,
          version,
          completedAt,
          loading: false,
        });

        // Redirect logic - only if not already on onboarding/auth pages
        const isOnboardingPage = location.pathname.startsWith('/app/onboarding');
        const isAuthPage = location.pathname.startsWith('/auth/');
        
        if (!isOnboardingPage && !isAuthPage && !hasRedirected.current) {
          if (!isCompleted) {
            console.log('[useOnboardingGuard] Onboarding not complete, redirecting');
            hasRedirected.current = true;
            navigate('/app/onboarding', { replace: true });
          }
        }
      } catch (error) {
        console.error('[useOnboardingGuard] Exception:', error);
        setState(prev => ({ ...prev, loading: false }));
      }
    };

    fetchOnboardingStatus();
  }, [userId, navigate, location.pathname, toast]);

  return state;
}

/**
 * Helper to complete onboarding with server timestamp
 */
export async function completeOnboarding(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_profiles')
      .update({
        onboarding_completed_at: new Date().toISOString(),
        onboarding_version: 1,
        onboarding_status: 'completed',
        onboarding_completed: true,
        required_fields_ok: true,
      })
      .eq('id', userId);

    if (error) {
      console.error('[completeOnboarding] Error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[completeOnboarding] Exception:', error);
    return false;
  }
}

/**
 * Legacy helper for compatibility - calls new function
 */
export async function updateOnboardingStatus(
  userId: string,
  updates: {
    status?: 'not_started' | 'in_progress' | 'completed';
    step?: number;
    required_fields_ok?: boolean;
  }
): Promise<void> {
  const updateData: Record<string, unknown> = {};
  
  if (updates.status !== undefined) {
    updateData.onboarding_status = updates.status;
    if (updates.status === 'completed') {
      updateData.onboarding_completed = true;
      updateData.onboarding_completed_at = new Date().toISOString();
      updateData.onboarding_version = 1;
    }
  }
  
  if (updates.step !== undefined) {
    updateData.onboarding_step = updates.step;
  }
  
  if (updates.required_fields_ok !== undefined) {
    updateData.required_fields_ok = updates.required_fields_ok;
  }

  const { error } = await supabase
    .from('user_profiles')
    .update(updateData)
    .eq('id', userId);

  if (error) {
    console.error('[updateOnboardingStatus] Error:', error);
    throw error;
  }
}
