import { Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface RecipePortionBadgeProps {
  adults: number;
  children: number;
  className?: string;
}

export function RecipePortionBadge({ 
  adults, 
  children,
  className 
}: RecipePortionBadgeProps) {
  const effectiveSize = (adults + children * 0.7).toFixed(1);
  
  if (adults === 1 && children === 0) {
    return (
      <Badge variant="secondary" className={className}>
        <Users className="h-3 w-3 mr-1" />
        1 personne
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
      <span className="ml-1 opacity-70">
        (≈ {effectiveSize} portions)
      </span>
    </Badge>
  );
}
