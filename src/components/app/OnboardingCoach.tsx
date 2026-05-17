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
import { useOnboarding } from '@/hooks/useOnboarding';

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
    subtitle:
      'Étape 1 sur 4 — Commence par remplir ton profil pour que NutriZen puisse te proposer des menus vraiment adaptés à toi et à ta famille.',
    primaryCTA: 'Remplir mon profil',
    secondaryCTA: 'Plus tard',
    emoji: '👋',
    primaryAction: (navigate) => {
      navigate('/app/profile');
    },
  },
  {
    title: 'Génère ton premier menu en 1 clic 🍽️',
    subtitle:
      'Étape 2 sur 4 — Dis à NutriZen combien de repas tu veux, puis laisse-nous créer un menu équilibré pour la semaine.',
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
    subtitle:
      "Étape 3 sur 4 — Si un repas ne te plaît pas, tu peux le remplacer facilement grâce aux swaps, sans casser l'équilibre de ta semaine.",
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
    subtitle:
      "Étape 4 sur 4 — Quand tu ne sais plus quoi manger, NutriZen t'aide à partir de ce que tu as déjà dans ton frigo (InspiFrigo) ou à partir de la photo de ton assiette (ScanRepas).",
    primaryCTA: 'Découvrir ces fonctionnalités',
    secondaryCTA: 'Terminer',
    emoji: '🧠',
    primaryAction: (navigate) => {
      navigate('/app/ai-tools');
    },
  },
];

/**
 * OnboardingCoach - Post-onboarding tips modal
 * Only shows AFTER the main onboarding is completed (for returning users)
 * This is separate from the main /app/onboarding flow
 */
export const OnboardingCoach = ({ userId }: OnboardingCoachProps) => {
  const navigate = useNavigate();
  const { currentStep, shouldShow, nextStep, skipStep, loading } = useOnboarding(userId);
  const [isOpen, setIsOpen] = useState(false);

  // Show modal when onboarding should be displayed
  useEffect(() => {
    // Don't show while loading
    if (loading) return;

    // Show if shouldShow is true and we have a valid step
    if (shouldShow && currentStep >= 0 && currentStep < 4) {
      // Small delay to let the page render first
      const timer = setTimeout(() => setIsOpen(true), 500);
      return () => clearTimeout(timer);
    } else {
      // Close modal when onboarding is completed or shouldn't show
      setIsOpen(false);
    }
  }, [shouldShow, currentStep, loading]);

  // Get current step configuration
  const stepConfig = ONBOARDING_STEPS[currentStep];

  // Don't render anything if loading, shouldn't show, or no step config
  if (loading || !shouldShow || !stepConfig) {
    return null;
  }

  const handlePrimaryAction = async () => {
    setIsOpen(false);
    // Execute the step's primary action
    stepConfig.primaryAction(navigate);
    // Wait a bit before moving to next step
    setTimeout(async () => {
      await nextStep();
    }, 500);
  };

  const handleSecondaryAction = async () => {
    setIsOpen(false);
    await skipStep();
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
          <DialogTitle className="text-2xl flex items-center gap-2">{stepConfig.title}</DialogTitle>
          <DialogDescription className="text-base pt-2">{stepConfig.subtitle}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-col gap-2 sm:gap-2">
          <Button onClick={handlePrimaryAction} className="w-full" size="lg">
            {stepConfig.primaryCTA}
          </Button>
          <Button onClick={handleSecondaryAction} variant="ghost" className="w-full" size="lg">
            {stepConfig.secondaryCTA}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
