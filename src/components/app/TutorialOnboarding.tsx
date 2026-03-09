import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, CalendarDays, Camera, Refrigerator, ShoppingCart, Gift, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import nutrizenLogo from '@/assets/nutrizen-main-logo.png';

interface TutorialStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  emoji: string;
}

const steps: TutorialStep[] = [
  {
    title: 'Bienvenue sur NutriZen 🎉',
    description: 'Voici comment tirer le meilleur parti de ton application en quelques étapes.',
    icon: <img src={nutrizenLogo} alt="NutriZen" className="h-16 w-auto" />,
    emoji: '🎉',
  },
  {
    title: 'Complète ton profil',
    description: 'Renseigne tes objectifs, préférences alimentaires et informations personnelles pour des menus 100% adaptés à toi.',
    icon: <User className="h-12 w-12" />,
    emoji: '📋',
  },
  {
    title: 'Génère tes menus personnalisés',
    description: 'En un clic, obtiens une semaine de menus équilibrés et adaptés à tes besoins nutritionnels.',
    icon: <CalendarDays className="h-12 w-12" />,
    emoji: '🥗',
  },
  {
    title: 'Scanne ton repas',
    description: 'Prends en photo n\'importe quel plat et découvre instantanément ses apports nutritionnels.',
    icon: <Camera className="h-12 w-12" />,
    emoji: '📸',
  },
  {
    title: 'InspiFrigo & Liste de courses',
    description: 'Photo de ton frigo = recettes personnalisées. Génère automatiquement ta liste de courses à partir de ton menu.',
    icon: (
      <div className="flex gap-2">
        <Refrigerator className="h-10 w-10" />
        <ShoppingCart className="h-10 w-10" />
      </div>
    ),
    emoji: '🛒',
  },
  {
    title: 'Parraine tes amis',
    description: 'Partage ton lien de parrainage unique et gagne des crédits pour chaque ami qui s\'inscrit.',
    icon: <Gift className="h-12 w-12" />,
    emoji: '🎁',
  },
];

export function TutorialOnboarding() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const checkTutorial = async () => {
      // Check localStorage first for fast UX
      const localKey = `tutorial_completed_${user.id}`;
      if (localStorage.getItem(localKey) === 'true') {
        setLoading(false);
        return;
      }

      // Check Supabase
      const { data } = await supabase
        .from('profiles')
        .select('tutorial_completed')
        .eq('id', user.id)
        .maybeSingle();

      if ((data as any)?.tutorial_completed) {
        localStorage.setItem(localKey, 'true');
        setLoading(false);
        return;
      }
        localStorage.setItem(localKey, 'true');
        setLoading(false);
        return;
      }

      setVisible(true);
      setLoading(false);
    };

    checkTutorial();
  }, [user]);

  const completeTutorial = async () => {
    if (!user) return;
    setVisible(false);

    const localKey = `tutorial_completed_${user.id}`;
    localStorage.setItem(localKey, 'true');

    await supabase
      .from('profiles')
      .update({ tutorial_completed: true } as any)
      .eq('id', user.id);
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTutorial();
    }
  };

  const handleSkip = () => {
    completeTutorial();
  };

  if (loading || !visible) return null;

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        >
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleSkip} />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
            style={{ backgroundColor: '#1A2E35' }}
          >
            {/* Progress bar */}
            <div className="h-1.5 bg-white/10">
              <motion.div
                className="h-full rounded-r-full"
                style={{ background: 'linear-gradient(90deg, #0D7377, #2A7D6F)' }}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>

            {/* Close button */}
            <button
              onClick={handleSkip}
              className="absolute top-4 right-4 text-white/50 hover:text-white/80 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Content */}
            <div className="px-6 pt-6 pb-8">
              {/* Logo */}
              <div className="flex justify-center mb-6">
                <img src={nutrizenLogo} alt="NutriZen" className="h-8 w-auto opacity-80" />
              </div>

              {/* Step indicator */}
              <div className="flex justify-center gap-1.5 mb-6">
                {steps.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === currentStep
                        ? 'w-6'
                        : i < currentStep
                        ? 'w-3'
                        : 'w-3'
                    }`}
                    style={{
                      backgroundColor:
                        i <= currentStep ? '#0D7377' : 'rgba(255,255,255,0.15)',
                    }}
                  />
                ))}
              </div>

              {/* Animated step content */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.25 }}
                  className="text-center"
                >
                  {/* Icon */}
                  <div className="flex justify-center mb-5">
                    <div
                      className="rounded-2xl p-5 text-white"
                      style={{ backgroundColor: 'rgba(13, 115, 119, 0.2)' }}
                    >
                      {currentStep === 0 ? (
                        <span className="text-5xl">{step.emoji}</span>
                      ) : (
                        <div style={{ color: '#2A7D6F' }}>{step.icon}</div>
                      )}
                    </div>
                  </div>

                  {/* Title */}
                  <h2 className="text-xl font-bold text-white mb-3">
                    {step.emoji} {step.title}
                  </h2>

                  {/* Description */}
                  <p className="text-white/70 text-sm leading-relaxed px-2">
                    {step.description}
                  </p>
                </motion.div>
              </AnimatePresence>

              {/* Buttons */}
              <div className="mt-8 flex flex-col gap-3">
                {isLast ? (
                  <Button
                    onClick={handleNext}
                    className="w-full h-12 text-base font-semibold text-white rounded-xl border-0"
                    style={{
                      background: 'linear-gradient(135deg, #0D7377, #E07B39)',
                    }}
                  >
                    C'est parti ! 🚀
                  </Button>
                ) : (
                  <Button
                    onClick={handleNext}
                    className="w-full h-12 text-base font-semibold text-white rounded-xl border-0"
                    style={{ backgroundColor: '#0D7377' }}
                  >
                    Suivant <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                )}

                {!isLast && (
                  <button
                    onClick={handleSkip}
                    className="text-white/40 text-sm hover:text-white/60 transition-colors"
                  >
                    Passer le tutoriel
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
