import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export interface OnboardingStatus {
  status: 'not_started' | 'in_progress' | 'completed';
  required_fields_ok: boolean;
  onboarding_step: number;
  loading: boolean;
}

/**
 * Hook to guard routes based on onboarding status.
 * Redirects to /onboarding if not completed.
 */
export function useOnboardingGuard(userId: string | undefined) {
  const [state, setState] = useState<OnboardingStatus>({
    status: 'not_started',
    required_fields_ok: false,
    onboarding_step: 0,
    loading: true,
  });
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!userId) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    const fetchOnboardingStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('onboarding_status, onboarding_step, required_fields_ok, onboarding_completed')
          .eq('id', userId)
          .single();

        if (error) {
          console.error('[useOnboardingGuard] Error fetching profile:', error);
          setState(prev => ({ ...prev, loading: false }));
          return;
        }

        // Determine status - handle legacy onboarding_completed field
        let status: 'not_started' | 'in_progress' | 'completed' = 
          (data?.onboarding_status as 'not_started' | 'in_progress' | 'completed') || 'not_started';
        
        // Migrate from old system if needed
        if (data?.onboarding_completed === true && status !== 'completed') {
          status = 'completed';
        }

        const requiredFieldsOk = data?.required_fields_ok ?? false;
        const step = data?.onboarding_step ?? 0;

        setState({
          status,
          required_fields_ok: requiredFieldsOk,
          onboarding_step: step,
          loading: false,
        });

        // Redirect logic - only if not already on onboarding page
        const isOnboardingPage = location.pathname.startsWith('/onboarding') || 
                                  location.pathname.startsWith('/app/onboarding');
        const isAuthPage = location.pathname.startsWith('/auth/');
        
        if (!isOnboardingPage && !isAuthPage) {
          // If onboarding not completed and required fields not ok, redirect
          if (status !== 'completed' || !requiredFieldsOk) {
            console.log('[useOnboardingGuard] Redirecting to onboarding');
            navigate('/app/onboarding', { replace: true });
          }
        }
      } catch (error) {
        console.error('[useOnboardingGuard] Exception:', error);
        setState(prev => ({ ...prev, loading: false }));
      }
    };

    fetchOnboardingStatus();
  }, [userId, navigate, location.pathname]);

  return state;
}

/**
 * Helper to update onboarding status
 */
export async function updateOnboardingStatus(
  userId: string,
  updates: {
    status?: 'not_started' | 'in_progress' | 'completed';
    step?: number;
    required_fields_ok?: boolean;
  }
) {
  const updateData: Record<string, any> = {};
  
  if (updates.status !== undefined) {
    updateData.onboarding_status = updates.status;
    // Also update legacy field for compatibility
    if (updates.status === 'completed') {
      updateData.onboarding_completed = true;
      updateData.onboarding_completed_at = new Date().toISOString();
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
