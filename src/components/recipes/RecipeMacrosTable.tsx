/**
 * Recipe Macros Table with cursor-based pagination
 * 
 * Uses the useMacrosPage hook for efficient data loading without OFFSET.
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, ChevronDown, Flame, Dumbbell, Wheat, Droplet, Leaf } from 'lucide-react';
import { useMacrosPage } from '@/hooks/useMacrosPage';
import { formatMacroValue } from '@/lib/macros';

interface RecipeMacrosTableProps {
  limit?: number;
}

export function RecipeMacrosTable({ limit = 25 }: RecipeMacrosTableProps) {
  const {
    items,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    loadMore,
    refresh,
  } = useMacrosPage({ limit });

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">Erreur</CardTitle>
          <CardDescription>{error.message}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={refresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Réessayer
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Macros des Recettes</CardTitle>
          <CardDescription>
            {items.length} recettes chargées • Pagination par curseur
          </CardDescription>
        </div>
        <Button onClick={refresh} variant="outline" size="sm" disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">ID Recette</TableHead>
                <TableHead className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Flame className="h-4 w-4 text-orange-500" />
                    Calories
                  </div>
                </TableHead>
                <TableHead className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Dumbbell className="h-4 w-4 text-red-500" />
                    Protéines
                  </div>
                </TableHead>
                <TableHead className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Wheat className="h-4 w-4 text-amber-500" />
                    Glucides
                  </div>
                </TableHead>
                <TableHead className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Droplet className="h-4 w-4 text-yellow-500" />
                    Lipides
                  </div>
                </TableHead>
                <TableHead className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Leaf className="h-4 w-4 text-green-500" />
                    Fibres
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                // Loading skeleton rows
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={`skeleton-${i}`}>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Aucune donnée de macros disponible
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.recipe_id}>
                    <TableCell className="font-mono text-xs">
                      {item.recipe_id}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMacroValue(item.calories_kcal, 0)} kcal
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMacroValue(item.proteins_g)} g
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMacroValue(item.carbs_g)} g
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMacroValue(item.fats_g)} g
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMacroValue(item.fibers_g)} g
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Load More Button */}
        {hasMore && !isLoading && (
          <div className="flex justify-center mt-4">
            <Button
              onClick={loadMore}
              disabled={isLoadingMore}
              variant="outline"
            >
              {isLoadingMore ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Chargement...
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-2" />
                  Charger plus
                </>
              )}
            </Button>
          </div>
        )}

        {!hasMore && items.length > 0 && (
          <p className="text-center text-muted-foreground text-sm mt-4">
            Toutes les recettes ont été chargées
          </p>
        )}
      </CardContent>
    </Card>
  );
}
