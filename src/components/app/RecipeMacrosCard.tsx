import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Flame, AlertCircle } from 'lucide-react';

interface RecipeMacrosCardProps {
  calories?: number;
  proteins?: number;
  carbs?: number;
  fats?: number;
  fibers?: number;
  sugars?: number;
  salt?: number;
  servings?: number;
  isLoading?: boolean;
  isPartial?: boolean;
}

export function RecipeMacrosCard({
  calories,
  proteins,
  carbs,
  fats,
  fibers,
  sugars,
  salt,
  servings = 1,
  isLoading = false,
  isPartial = false,
}: RecipeMacrosCardProps) {
  const [viewMode, setViewMode] = useState<'portion' | 'total'>('portion');

  // Calculate values based on view mode
  const factor = viewMode === 'portion' ? 1 : servings;
  const displayValues = {
    calories: calories ? Math.round(calories * factor / servings) : null,
    proteins: proteins ? Math.round(proteins * factor / servings) : null,
    carbs: carbs ? Math.round(carbs * factor / servings) : null,
    fats: fats ? Math.round(fats * factor / servings) : null,
    fibers: fibers ? Math.round(fibers * factor / servings) : null,
    sugars: sugars ? Math.round(sugars * factor / servings) : null,
    salt: salt ? (salt * factor / servings).toFixed(1) : null,
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-8 w-32" />
        </div>
        <p className="text-sm text-muted-foreground mb-4 italic">
          Analyse nutritionnelle en cours…
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      </Card>
    );
  }

  // If no data at all, don't render
  if (!calories && !proteins && !carbs && !fats) {
    return null;
  }

  return (
    <Card className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Flame className="h-5 w-5 text-primary" />
          Valeurs nutritionnelles
        </h2>
        
        {/* Toggle between per portion and total */}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <Button
            variant={viewMode === 'portion' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('portion')}
            className="text-xs"
          >
            Par portion
          </Button>
          <Button
            variant={viewMode === 'total' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('total')}
            className="text-xs"
          >
            Total recette
          </Button>
        </div>
      </div>

      {/* Partial data warning */}
      {isPartial && (
        <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg mb-4 text-sm">
          <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          <span className="text-yellow-800 dark:text-yellow-200">
            Certaines valeurs sont estimées (ingrédients incomplets).
          </span>
        </div>
      )}

      {/* Main macros grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Calories */}
        {displayValues.calories !== null && (
          <div className="text-center p-4 bg-primary/10 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-2">
              <Flame className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Calories</span>
            </div>
            <div className="text-2xl font-bold text-primary">
              {displayValues.calories}
            </div>
            <div className="text-xs text-muted-foreground">kcal</div>
          </div>
        )}

        {/* Proteins */}
        {displayValues.proteins !== null && (
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <div className="text-sm text-muted-foreground mb-2">Protéines</div>
            <div className="text-2xl font-semibold text-blue-700 dark:text-blue-400">
              {displayValues.proteins}
            </div>
            <div className="text-xs text-muted-foreground">g</div>
          </div>
        )}

        {/* Carbs */}
        {displayValues.carbs !== null && (
          <div className="text-center p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
            <div className="text-sm text-muted-foreground mb-2">Glucides</div>
            <div className="text-2xl font-semibold text-amber-700 dark:text-amber-400">
              {displayValues.carbs}
            </div>
            <div className="text-xs text-muted-foreground">g</div>
          </div>
        )}

        {/* Fats */}
        {displayValues.fats !== null && (
          <div className="text-center p-4 bg-red-50 dark:bg-red-950/20 rounded-lg">
            <div className="text-sm text-muted-foreground mb-2">Lipides</div>
            <div className="text-2xl font-semibold text-red-700 dark:text-red-400">
              {displayValues.fats}
            </div>
            <div className="text-xs text-muted-foreground">g</div>
          </div>
        )}
      </div>

      {/* Secondary macros */}
      {(displayValues.fibers !== null || displayValues.sugars !== null || displayValues.salt !== null) && (
        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t">
          {displayValues.fibers !== null && (
            <Badge variant="secondary" className="text-xs">
              Fibres : {displayValues.fibers}g
            </Badge>
          )}
          {displayValues.sugars !== null && (
            <Badge variant="secondary" className="text-xs">
              Sucres : {displayValues.sugars}g
            </Badge>
          )}
          {displayValues.salt !== null && (
            <Badge variant="secondary" className="text-xs">
              Sel : {displayValues.salt}g
            </Badge>
          )}
        </div>
      )}

      {/* Portion indicator */}
      <div className="mt-4 text-xs text-muted-foreground text-center">
        {viewMode === 'portion' 
          ? `Valeurs pour 1 portion (recette pour ${servings} portions)`
          : `Valeurs totales pour ${servings} portions`
        }
      </div>
    </Card>
  );
}
