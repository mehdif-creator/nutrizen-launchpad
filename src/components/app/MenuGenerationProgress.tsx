import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Loader2, AlertCircle, RefreshCw, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MenuGenerationProgressProps {
  status: 'idle' | 'generating' | 'success' | 'error';
  onRetry?: () => void;
  onSkip?: () => void;
  errorMessage?: string;
  className?: string;
}

const GENERATION_STEPS = [
  { key: 'profile', label: 'Analyse du profil', duration: 1000 },
  { key: 'recipes', label: 'Sélection des recettes', duration: 2500 },
  { key: 'portions', label: 'Ajustement des portions', duration: 1500 },
  { key: 'shopping', label: 'Création de la liste de courses', duration: 1500 },
];

const LOADING_MESSAGES = [
  "On dresse la table...",
  "On affine le menu comme un chef...",
  "On consulte le guide Michelin...",
  "Deux secondes, on fait chauffer les fourneaux...",
  "On prépare ta semaine aux petits oignons...",
  "On équilibre les macros au gramme près...",
  "On sélectionne les meilleures recettes...",
  "Patience, la perfection prend du temps...",
];

/**
 * Animated progress screen for menu generation after onboarding
 * Shows step-by-step progress with French messages
 */
export function MenuGenerationProgress({
  status,
  onRetry,
  onSkip,
  errorMessage,
  className,
}: MenuGenerationProgressProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0]);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Animate through steps
  useEffect(() => {
    if (status !== 'generating') return;

    let totalElapsed = 0;
    const interval = setInterval(() => {
      totalElapsed += 500;
      setElapsedTime(totalElapsed);

      // Calculate which step we should be on
      let accumulated = 0;
      for (let i = 0; i < GENERATION_STEPS.length; i++) {
        accumulated += GENERATION_STEPS[i].duration;
        if (totalElapsed < accumulated) {
          setCurrentStepIndex(i);
          break;
        }
        if (i === GENERATION_STEPS.length - 1) {
          setCurrentStepIndex(i);
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [status]);

  // Rotate loading messages
  useEffect(() => {
    if (status !== 'generating') return;

    const interval = setInterval(() => {
      setLoadingMessage(prev => {
        const currentIndex = LOADING_MESSAGES.indexOf(prev);
        const nextIndex = (currentIndex + 1) % LOADING_MESSAGES.length;
        return LOADING_MESSAGES[nextIndex];
      });
    }, 2500);

    return () => clearInterval(interval);
  }, [status]);

  // Show extended message after 10 seconds
  const showExtendedMessage = elapsedTime > 10000 && status === 'generating';

  if (status === 'idle') return null;

  if (status === 'success') {
    return (
      <div className={cn("min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5 p-4", className)}>
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="flex justify-center">
              <div className="relative">
                <CheckCircle2 className="h-16 w-16 text-primary" />
                <div className="absolute -inset-2 rounded-full bg-primary/20 animate-ping" style={{ animationDuration: '2s' }} />
              </div>
            </div>
            <h2 className="text-2xl font-bold">Ton menu est prêt ! 🎉</h2>
            <p className="text-muted-foreground">Redirection vers ton tableau de bord...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className={cn("min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5 p-4", className)}>
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-14 h-14 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-7 w-7 text-destructive" />
            </div>
            <CardTitle className="text-xl">La génération a échoué</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {errorMessage && (
              <p className="text-center text-sm text-muted-foreground">
                {errorMessage}
              </p>
            )}
            <div className="flex flex-col gap-3">
              {onRetry && (
                <Button onClick={onRetry} className="w-full">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Relancer la génération
                </Button>
              )}
              {onSkip && (
                <Button onClick={onSkip} variant="outline" className="w-full">
                  Continuer sans menu
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Generating state
  const totalDuration = GENERATION_STEPS.reduce((acc, s) => acc + s.duration, 0);
  const progressPercent = Math.min(95, (elapsedTime / totalDuration) * 100);

  return (
    <div className={cn("min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5 p-4", className)}>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <Sparkles className="h-14 w-14 text-primary animate-pulse" />
              <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" style={{ animationDuration: '2s' }} />
            </div>
          </div>
          <CardTitle className="text-xl">Génération de ton menu...</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress bar */}
          <div className="space-y-2">
            <Progress value={progressPercent} className="h-2" />
            <p className="text-xs text-center text-muted-foreground">
              {Math.round(progressPercent)}%
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-3">
            {GENERATION_STEPS.map((step, index) => {
              const isCompleted = index < currentStepIndex;
              const isCurrent = index === currentStepIndex;

              return (
                <div 
                  key={step.key} 
                  className={cn(
                    "flex items-center gap-3 p-2 rounded-lg transition-all",
                    isCurrent && "bg-primary/5",
                    isCompleted && "opacity-60"
                  )}
                >
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                    isCompleted ? "bg-primary text-primary-foreground" :
                    isCurrent ? "bg-primary/20 text-primary" :
                    "bg-muted text-muted-foreground"
                  )}>
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : isCurrent ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span className={cn(
                    "text-sm",
                    isCurrent && "font-medium",
                    !isCompleted && !isCurrent && "text-muted-foreground"
                  )}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Rotating message */}
          <div className="text-center pt-2 border-t">
            <p className="text-sm text-muted-foreground italic">
              {loadingMessage}
            </p>
            {showExtendedMessage && (
              <p className="text-xs text-muted-foreground mt-2">
                Encore quelques secondes, on finalise ton menu...
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
