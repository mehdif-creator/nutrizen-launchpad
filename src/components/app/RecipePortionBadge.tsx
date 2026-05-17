import { Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface RecipePortionBadgeProps {
  adults: number;
  children: number;
  effectivePortions?: number;
  className?: string;
}

export function RecipePortionBadge({
  adults,
  children,
  effectivePortions,
  className,
}: RecipePortionBadgeProps) {
  // Single source of truth: only use effectivePortions from the hook, never recalculate
  if (effectivePortions == null) return null;
  const effectiveSize = effectivePortions.toFixed(1);

  if (adults === 1 && children === 0) {
    return (
      <Badge variant="secondary" className={className}>
        <Users className="h-3 w-3 mr-1" />1 personne
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className={className}>
      <Users className="h-3 w-3 mr-1" />
      {adults > 0 && (
        <>
          {adults} adulte{adults > 1 ? 's' : ''}
        </>
      )}
      {adults > 0 && children > 0 && ' + '}
      {children > 0 && (
        <>
          {children} enfant{children > 1 ? 's' : ''}
        </>
      )}
      <span className="ml-1 opacity-70">(≈ {effectiveSize} portions)</span>
    </Badge>
  );
}
