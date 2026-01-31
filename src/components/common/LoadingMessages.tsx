import { useState, useEffect, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type LoadingVariant = 
  | 'dashboard' 
  | 'menu' 
  | 'recipe' 
  | 'grocery' 
  | 'payment' 
  | 'general';

interface LoadingMessagesProps {
  variant?: LoadingVariant;
  isLoading: boolean;
  className?: string;
  showSkeleton?: boolean;
  skeletonCount?: number;
  minDisplayMs?: number;
}

const MESSAGES: Record<LoadingVariant, string[]> = {
  dashboard: [
    'On dresse la table…',
    'On vérifie tes progrès…',
    'On prépare ton tableau de bord…',
    'Deux secondes, on fait le point…',
    'On consulte ton agenda culinaire…',
    'On rassemble tes infos…',
  ],
  menu: [
    'On affine le menu comme un chef…',
    'On consulte le guide Michelin…',
    'On compose tes repas de la semaine…',
    'On équilibre tes macros aux petits oignons…',
    'On mijote un menu sur mesure…',
    'On prépare une semaine gourmande…',
    'On sélectionne les meilleures recettes…',
  ],
  recipe: [
    'On consulte le livre de recettes…',
    'On calcule tes macros au gramme près…',
    'On prépare les instructions…',
    'On vérifie les ingrédients…',
    'On peaufine les détails…',
  ],
  grocery: [
    'On prépare ta liste de courses…',
    'On organise par rayon…',
    'On vérifie les quantités…',
    'On optimise ton panier…',
    'On trie les ingrédients…',
  ],
  payment: [
    'On sécurise ta transaction…',
    'On vérifie ton paiement…',
    'Un instant, on finalise…',
  ],
  general: [
    'Chargement en cours...',
    'Un petit moment...',
    'On se met au travail...',
    'Presque pret...',
  ],
};

export function LoadingMessages({
  variant = 'general',
  isLoading,
  className,
  showSkeleton = true,
  skeletonCount = 3,
  minDisplayMs = 600,
}: LoadingMessagesProps) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [shouldShow, setShouldShow] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);

  const messages = useMemo(() => MESSAGES[variant] || MESSAGES.general, [variant]);

  // Track loading start time
  useEffect(() => {
    if (isLoading && !startTime) {
      setStartTime(Date.now());
    } else if (!isLoading) {
      setStartTime(null);
      setShouldShow(false);
    }
  }, [isLoading, startTime]);

  // Only show messages after minDisplayMs
  useEffect(() => {
    if (!isLoading || !startTime) return;

    const timer = setTimeout(() => {
      setShouldShow(true);
    }, minDisplayMs);

    return () => clearTimeout(timer);
  }, [isLoading, startTime, minDisplayMs]);

  // Rotate messages
  useEffect(() => {
    if (!isLoading || !shouldShow) return;

    const interval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % messages.length);
    }, 1200);

    return () => clearInterval(interval);
  }, [isLoading, shouldShow, messages.length]);

  if (!isLoading) return null;

  return (
    <div className={cn('space-y-4', className)}>
      {showSkeleton && (
        <div className="space-y-2">
          {Array.from({ length: skeletonCount }).map((_, i) => (
            <Skeleton 
              key={i} 
              className="h-4" 
              style={{ width: `${85 - i * 15}%` }} 
            />
          ))}
        </div>
      )}

      {shouldShow && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground animate-fade-in">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="transition-opacity duration-300">
            {messages[messageIndex]}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Inline loading message for compact spaces
 */
export function LoadingLine({
  variant = 'general',
  isLoading,
  className,
}: Pick<LoadingMessagesProps, 'variant' | 'isLoading' | 'className'>) {
  const [messageIndex, setMessageIndex] = useState(0);
  const messages = useMemo(() => MESSAGES[variant] || MESSAGES.general, [variant]);

  useEffect(() => {
    if (!isLoading) return;

    const interval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % messages.length);
    }, 1200);

    return () => clearInterval(interval);
  }, [isLoading, messages.length]);

  if (!isLoading) return null;

  return (
    <span className={cn('inline-flex items-center gap-1.5 text-muted-foreground', className)}>
      <Loader2 className="h-3 w-3 animate-spin" />
      <span className="text-sm">{messages[messageIndex]}</span>
    </span>
  );
}
