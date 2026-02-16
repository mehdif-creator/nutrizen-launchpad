 import { useState, useEffect, useCallback } from 'react';
 import { supabase } from '@/integrations/supabase/client';
 import { useToast } from '@/hooks/use-toast';
 import { createLogger } from '@/lib/logger';
 import { 
   getOnboardingStatus, 
   markOnboardingComplete,
   clearOnboardingCache 
 } from '@/lib/onboarding/status';

 const logger = createLogger('useOnboarding');
 
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
 
 /**
  * Hook for OnboardingCoach component
  * Uses centralized onboarding status
  */
 export const useOnboarding = (userId: string | undefined) => {
   const [state, setState] = useState<OnboardingState>({
     currentStep: 0,
     completed: true, // Default to completed to prevent flash
     loading: true,
   });
   const { toast } = useToast();
 
   // Fetch onboarding state using centralized helper
   useEffect(() => {
     if (!userId) {
       setState({ currentStep: 0, completed: true, loading: false });
       return;
     }
 
     let mounted = true;
 
     const fetchState = async () => {
       const status = await getOnboardingStatus(userId);
       
       if (!mounted) return;
 
       setState({
         currentStep: status.step,
         completed: status.state === 'onboarded',
         loading: false,
       });
     };
 
     fetchState();
 
     return () => {
       mounted = false;
     };
   }, [userId]);
 
   // Update onboarding step in Supabase
   const updateStep = useCallback(async (step: number) => {
     if (!userId) return;
 
     try {
       const { error } = await supabase
          .from('profiles')
         .update({ onboarding_step: step })
         .eq('id', userId);
 
       if (error) throw error;
 
       clearOnboardingCache(userId);
       setState(prev => ({ ...prev, currentStep: step }));
     } catch (error) {
       logger.error('Error updating onboarding step', error instanceof Error ? error : new Error(String(error)));
       toast({
         variant: 'destructive',
         title: 'Erreur',
         description: 'Impossible de sauvegarder ta progression.',
       });
     }
   }, [userId, toast]);
 
   // Complete onboarding using centralized function
   const completeOnboarding = useCallback(async () => {
     if (!userId) return;
 
     try {
       const success = await markOnboardingComplete(userId);
       
       if (!success) {
         throw new Error('Failed to complete onboarding');
       }
 
       setState({ currentStep: 4, completed: true, loading: false });
       
       toast({
         title: '🎉 Bienvenue dans NutriZen !',
         description: 'Tu es prêt(e) à profiter de tous les outils.',
       });
     } catch (error) {
       logger.error('Error completing onboarding', error instanceof Error ? error : new Error(String(error)));
       toast({
         variant: 'destructive',
         title: 'Erreur',
         description: 'Impossible de finaliser l\'onboarding.',
       });
     }
   }, [userId, toast]);
 
   // Go to next step
   const nextStep = useCallback(async () => {
     const next = state.currentStep + 1;
     if (next >= 4) {
       await completeOnboarding();
     } else {
       await updateStep(next);
     }
   }, [state.currentStep, completeOnboarding, updateStep]);
 
   // Skip current step (same as next)
   const skipStep = useCallback(async () => {
     await nextStep();
   }, [nextStep]);
 
   // Reset onboarding (for testing)
   const resetOnboarding = useCallback(async () => {
     if (!userId) return;
 
     try {
       const { error } = await supabase
         .from('profiles')
         .update({ 
           onboarding_step: 0,
           onboarding_completed: false,
           onboarding_completed_at: null,
           onboarding_status: 'not_started',
         })
         .eq('id', userId);
 
       if (error) throw error;
 
       clearOnboardingCache(userId);
       setState({ currentStep: 0, completed: false, loading: false });
     } catch (error) {
       logger.error('Error resetting onboarding', error instanceof Error ? error : new Error(String(error)));
     }
   }, [userId]);
 
   return {
     currentStep: state.currentStep,
     completed: state.completed,
     loading: state.loading,
     // Only show if not loading AND not completed AND step < 4
     shouldShow: !state.loading && !state.completed && state.currentStep < 4,
     nextStep,
     skipStep,
     completeOnboarding,
     resetOnboarding,
   };
 };
