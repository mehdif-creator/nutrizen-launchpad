import { Button } from '@/components/ui/button';
import { Clock, Flame } from 'lucide-react';

interface MealCardProps {
  day: string;
  title: string;
  time: number;
  kcal: number;
  imageUrl?: string | null;
  onValidate?: () => void;
  onSwap?: () => void;
  onViewRecipe?: () => void;
  swapsRemaining?: number;
}

export function MealCard({
  day,
  title,
  time,
  kcal,
  imageUrl,
  onValidate,
  onSwap,
  onViewRecipe,
  swapsRemaining = 0
}: MealCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden group hover:shadow-lg transition-all">
      <div className="h-32 bg-muted relative overflow-hidden">
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={title}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/img/hero-default.png';
            }}
          />
        ) : (
          <img 
            src="/img/hero-default.png"
            alt={title}
            className="w-full h-full object-cover opacity-50"
          />
        )}
      </div>
      <div className="p-4 space-y-2">
        <div className="text-xs text-muted-foreground font-medium">{day}</div>
        <div className="font-semibold leading-tight line-clamp-2">{title}</div>
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
