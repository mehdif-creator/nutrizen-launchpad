import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';

interface OnboardingCoachProps {
  userId: string | undefined;
}

interface StepConfig {
  title: string;
  subtitle: string;
  primaryCTA: string;
  secondaryCTA: string;
  emoji: string;
  primaryAction: (navigate: ReturnType<typeof useNavigate>) => void;
}

const ONBOARDING_STEPS: StepConfig[] = [
  {
    title: 'Bienvenue sur NutriZen 👋',
    subtitle: 'Étape 1 sur 4 — Commence par remplir ton profil pour que NutriZen puisse te proposer des menus vraiment adaptés à toi et à ta famille.',
    primaryCTA: 'Remplir mon profil',
    secondaryCTA: 'Plus tard',
    emoji: '👋',
    primaryAction: (navigate) => {
      navigate('/app/profile');
    },
  },
  {
    title: 'Génère ton premier menu en 1 clic 🍽️',
    subtitle: 'Étape 2 sur 4 — Dis à NutriZen combien de repas tu veux, puis laisse-nous créer un menu équilibré pour la semaine.',
    primaryCTA: 'Créer mon premier menu',
    secondaryCTA: 'Plus tard',
    emoji: '🍽️',
    primaryAction: () => {
      // Scroll to the hero section with the "Régénérer ma semaine" button
      const heroSection = document.querySelector('[data-onboarding-target="generate-menu"]');
      if (heroSection) {
        heroSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Add a temporary highlight effect
        heroSection.classList.add('ring-2', 'ring-primary', 'ring-offset-2', 'rounded-lg');
        setTimeout(() => {
          heroSection.classList.remove('ring-2', 'ring-primary', 'ring-offset-2', 'rounded-lg');
        }, 3000);
      }
    },
  },
  {
    title: 'Utilise les swaps pour adapter ton menu 🔁',
    subtitle: 'Étape 3 sur 4 — Si un repas ne te plaît pas, tu peux le remplacer facilement grâce aux swaps, sans casser l\'équilibre de ta semaine.',
    primaryCTA: 'Voir comment ça marche',
    secondaryCTA: 'Compris',
    emoji: '🔁',
    primaryAction: () => {
      // Scroll to the first meal card
      const firstMealCard = document.querySelector('[data-onboarding-target="meal-card"]');
      if (firstMealCard) {
        firstMealCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Add a temporary highlight effect
        firstMealCard.classList.add('ring-2', 'ring-primary', 'ring-offset-2', 'rounded-lg');
        setTimeout(() => {
          firstMealCard.classList.remove('ring-2', 'ring-primary', 'ring-offset-2', 'rounded-lg');
        }, 3000);
      }
    },
  },
  {
    title: 'Bloqué ? Utilise InspiFrigo et ScanRepas 🧠',
    subtitle: 'Étape 4 sur 4 — Quand tu ne sais plus quoi manger, NutriZen t\'aide à partir de ce que tu as déjà dans ton frigo (InspiFrigo) ou à partir de la photo de ton assiette (ScanRepas).',
    primaryCTA: 'Découvrir ces fonctionnalités',
    secondaryCTA: 'Terminer',
    emoji: '🧠',
    primaryAction: (navigate) => {
      navigate('/app/ai-tools');
    },
  },
];

/**
 * OnboardingCoach - Post-onboarding walkthrough modal
 * 
 * NOTE: This is separate from the main onboarding flow. It shows AFTER
 * onboarding is complete to help users discover features.
 * 
 * Uses onboarding_step from user_profiles to track which coach step the user is on.
 * This is different from onboarding_completed_at which tracks onboarding completion.
 */
export const OnboardingCoach = ({ userId }: OnboardingCoachProps) => {
  const navigate = useNavigate();
  const { completed: onboardingComplete, loading: onboardingLoading } = useOnboardingStatus(userId);
  
  const [currentStep, setCurrentStep] = useState(0);
  const [coachCompleted, setCoachCompleted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch coach step from user_profiles
  useEffect(() => {
    if (!userId || onboardingLoading) return;
    
    // Coach only runs AFTER onboarding is complete
    if (!onboardingComplete) {
      setLoading(false);
      return;
    }

    const fetchCoachStep = async () => {
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('onboarding_step, onboarding_completed')
          .eq('id', userId)
          .single();

        if (error) {
          console.error('[OnboardingCoach] Error:', error);
          setLoading(false);
          return;
        }

        // Check if coach walkthrough is complete (step >= 4 or onboarding_completed is true)
        // This uses the legacy fields for coach tracking
        if (data?.onboarding_step >= 4 || data?.onboarding_completed === true) {
          setCoachCompleted(true);
        } else {
          setCurrentStep(data?.onboarding_step || 0);
        }

        setLoading(false);
      } catch (error) {
        console.error('[OnboardingCoach] Exception:', error);
        setLoading(false);
      }
    };

    fetchCoachStep();
  }, [userId, onboardingComplete, onboardingLoading]);

  // Show modal when coach should be displayed
  useEffect(() => {
    if (!loading && onboardingComplete && !coachCompleted && currentStep >= 0 && currentStep < 4) {
      // Small delay to let the page render first
      const timer = setTimeout(() => setIsOpen(true), 500);
      return () => clearTimeout(timer);
    } else {
      setIsOpen(false);
    }
  }, [loading, onboardingComplete, coachCompleted, currentStep]);

  // Get current step configuration
  const stepConfig = ONBOARDING_STEPS[currentStep];

  // Update step in database
  const updateStep = async (step: number) => {
    if (!userId) return;

    try {
      await supabase
        .from('user_profiles')
        .update({ onboarding_step: step })
        .eq('id', userId);
    } catch (error) {
      console.error('[OnboardingCoach] Error updating step:', error);
    }
  };

  // Complete the coach walkthrough
  const completeCoach = async () => {
    if (!userId) return;

    try {
      await supabase
        .from('user_profiles')
        .update({ 
          onboarding_step: 4,
          onboarding_completed: true,
        })
        .eq('id', userId);

      setCoachCompleted(true);
    } catch (error) {
      console.error('[OnboardingCoach] Error completing coach:', error);
    }
  };

  // Don't show if not ready
  if (loading || !onboardingComplete || coachCompleted || !stepConfig) {
    return null;
  }

  const handlePrimaryAction = async () => {
    setIsOpen(false);
    // Execute the step's primary action
    stepConfig.primaryAction(navigate);
    // Wait a bit before moving to next step
    setTimeout(async () => {
      const nextStep = currentStep + 1;
      if (nextStep >= 4) {
        await completeCoach();
      } else {
        await updateStep(nextStep);
        setCurrentStep(nextStep);
      }
    }, 500);
  };

  const handleSecondaryAction = async () => {
    setIsOpen(false);
    const nextStep = currentStep + 1;
    if (nextStep >= 4) {
      await completeCoach();
    } else {
      await updateStep(nextStep);
      setCurrentStep(nextStep);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between mb-2">
            <Badge variant="secondary" className="text-xs">
              Étape {currentStep + 1}/4
            </Badge>
          </div>
          <DialogTitle className="text-2xl flex items-center gap-2">
            {stepConfig.title}
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            {stepConfig.subtitle}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-col gap-2 sm:gap-2">
          <Button 
            onClick={handlePrimaryAction}
            className="w-full"
            size="lg"
          >
            {stepConfig.primaryCTA}
          </Button>
          <Button 
            onClick={handleSecondaryAction}
            variant="ghost"
            className="w-full"
            size="lg"
          >
            {stepConfig.secondaryCTA}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
