import { Button } from '@/components/ui/button';
import { Clock, Flame, Users, ImageOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { RecipeMacrosBadge } from '@/components/app/RecipeMacrosBadge';
import { getRecipeImageUrl, handleImageError, RECIPE_PLACEHOLDER } from '@/lib/images';
import { useState } from 'react';

interface MealCardProps {
  day: string;
  title: string;
  time: number;
  kcal: number;
  imageUrl?: string | null;
  imagePath?: string | null;
  onValidate?: () => void;
  onSwap?: () => void;
  onViewRecipe?: () => void;
  swapsRemaining?: number;
  householdAdults?: number;
  householdChildren?: number;
  proteins?: number;
  carbs?: number;
  fats?: number;
  servings?: number;
  'data-onboarding-target'?: string;
}

export function MealCard({
  day,
  title,
  time,
  kcal,
  imageUrl,
  imagePath,
  onValidate,
  onSwap,
  onViewRecipe,
  swapsRemaining = 0,
  householdAdults = 1,
  householdChildren = 0,
  proteins,
  carbs,
  fats,
  servings = 1,
  'data-onboarding-target': dataOnboardingTarget
}: MealCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const effectiveSize = (householdAdults + householdChildren * 0.7).toFixed(1);
  
  const displayImageUrl = getRecipeImageUrl({ image_url: imageUrl, image_path: imagePath });
  
  const onImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    handleImageError(e);
    setImageFailed(true);
  };
  
  return (
    <div 
      className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden group hover:shadow-lg transition-all"
      data-onboarding-target={dataOnboardingTarget}
    >
      <div className="h-32 bg-muted relative overflow-hidden">
        <img 
          src={displayImageUrl} 
          alt={title}
          className={`w-full h-full object-cover ${imageFailed ? 'opacity-60' : ''}`}
          onError={onImgError}
        />
        {imageFailed && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/80">
            <div className="text-center">
              <ImageOff className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
              <span className="text-xs text-muted-foreground">Image indisponible</span>
            </div>
          </div>
        )}
      </div>
      <div className="p-4 space-y-2">
        <div className="text-xs text-muted-foreground font-medium">{day}</div>
        <div className="font-semibold leading-tight line-clamp-2">{title}</div>
        
        {/* Household portions badge */}
        {(householdAdults > 1 || householdChildren > 0) && (
          <Badge variant="secondary" className="text-xs">
            <Users className="h-3 w-3 mr-1" />
            {householdAdults > 0 && `${householdAdults} adulte${householdAdults > 1 ? 's' : ''}`}
            {householdAdults > 0 && householdChildren > 0 && ' + '}
            {householdChildren > 0 && `${householdChildren} enfant${householdChildren > 1 ? 's' : ''}`}
            <span className="ml-1 opacity-70">(≈ {effectiveSize})</span>
          </Badge>
        )}
        
        <div className="text-xs text-muted-foreground flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {time} min
          </span>
          <span>·</span>
          <span className="inline-flex items-center gap-1">
            <Flame className="h-3.5 w-3.5" />
            {kcal} kcal
          </span>
        </div>
        
        {/* Macros badge */}
        <RecipeMacrosBadge 
          calories={kcal * servings}
          proteins={proteins}
          carbs={carbs}
          fats={fats}
          servings={servings}
        />
        <div className="flex items-center gap-2 pt-2">
          <Button 
            onClick={onValidate}
            size="sm" 
            className="flex-1"
          >
            Valider
          </Button>
          <Button 
            onClick={onSwap}
            size="sm" 
            variant="outline"
            disabled={swapsRemaining <= 0}
          >
            Swap {swapsRemaining > 0 ? `(${swapsRemaining})` : "(0)"}
          </Button>
        </div>
        <Button 
          onClick={onViewRecipe}
          size="sm" 
          variant="ghost" 
          className="w-full text-xs"
        >
          Voir la recette →
        </Button>
      </div>
    </div>
  );
}
