import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface OnboardingStep {
  step: number;
  title: string;
  subtitle: string;
  primaryCTA: string;
  secondaryCTA: string;
  primaryAction: () => void;
  secondaryAction: () => void;
  emoji: string;
}

interface OnboardingState {
  currentStep: number;
  completed: boolean;
  loading: boolean;
}

export const useOnboarding = (userId: string | undefined) => {
  const [state, setState] = useState<OnboardingState>({
    currentStep: 0,
    completed: false,
    loading: true,
  });
  const [hasFetched, setHasFetched] = useState(false);
  const { toast } = useToast();

  // Fetch onboarding state from Supabase - only once
  useEffect(() => {
    if (!userId || hasFetched) {
      if (!userId) {
        setState({ currentStep: 0, completed: false, loading: false });
      }
      return;
    }

    const fetchOnboardingState = async () => {
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('onboarding_step, onboarding_completed')
          .eq('id', userId)
          .single();

        if (error) throw error;

        const isCompleted = data?.onboarding_completed === true || data?.onboarding_step >= 4;
        
        setState({
          currentStep: data?.onboarding_step || 0,
          completed: isCompleted,
          loading: false,
        });
        setHasFetched(true);
      } catch (error) {
        console.error('Error fetching onboarding state:', error);
        setState({ currentStep: 0, completed: false, loading: false });
        setHasFetched(true);
      }
    };

    fetchOnboardingState();
  }, [userId, hasFetched]);

  // Update onboarding step in Supabase
  const updateStep = async (step: number) => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ onboarding_step: step })
        .eq('id', userId);

      if (error) throw error;

      setState(prev => ({ ...prev, currentStep: step }));
    } catch (error) {
      console.error('Error updating onboarding step:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de sauvegarder ta progression.',
      });
    }
  };

  // Complete onboarding
  const completeOnboarding = async () => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          onboarding_step: 4,
          onboarding_completed: true 
        })
        .eq('id', userId);

      if (error) throw error;

      setState({ currentStep: 4, completed: true, loading: false });
      
      toast({
        title: '🎉 Bienvenue dans NutriZen !',
        description: 'Tu es prêt(e) à profiter de tous les outils.',
      });
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de finaliser l\'onboarding.',
      });
    }
  };

  // Go to next step
  const nextStep = async () => {
    const next = state.currentStep + 1;
    if (next >= 4) {
      await completeOnboarding();
    } else {
      await updateStep(next);
    }
  };

  // Skip current step (same as next)
  const skipStep = async () => {
    await nextStep();
  };

  // Reset onboarding (for testing)
  const resetOnboarding = async () => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ 
          onboarding_step: 0,
          onboarding_completed: false 
        })
        .eq('id', userId);

      if (error) throw error;

      setState({ currentStep: 0, completed: false, loading: false });
    } catch (error) {
      console.error('Error resetting onboarding:', error);
    }
  };

  return {
    currentStep: state.currentStep,
    completed: state.completed,
    loading: state.loading,
    shouldShow: !state.loading && !state.completed && state.currentStep < 4,
    nextStep,
    skipStep,
    completeOnboarding,
    resetOnboarding,
  };
};
