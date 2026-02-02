/**
 * Admin Macros Maintenance Page
 * 
 * Provides admin tools for managing recipe macros:
 * - View queue status and coverage stats
 * - Process macros queue in batches
 * - Refresh materialized view
 * 
 * Route: /admin/macros-maintenance
 */

import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppHeader } from '@/components/app/AppHeader';
import { AppFooter } from '@/components/app/AppFooter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Database,
  RefreshCw,
  Play,
  Zap,
  Layers,
  BarChart3,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { useMacrosAdmin } from '@/hooks/useMacrosAdmin';

export default function AdminMacrosMaintenance() {
  const { isAdmin, loading } = useAuth();
  const {
    coverage,
    queueCount,
    isLoadingCoverage,
    isLoadingQueue,
    isProcessing,
    isRefreshing,
    processQueue,
    processBatch,
    refreshMV2,
    refreshStats,
  } = useMacrosAdmin();

  // Redirect non-admin users
  if (!loading && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/20">
      <AppHeader />

      <main className="flex-1 px-4 sm:px-6 lg:px-10 py-8">
        <div className="max-w-5xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Database className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">Maintenance Macros</h1>
              <Badge variant="secondary">Admin</Badge>
            </div>
            <p className="text-muted-foreground">
              Gérez le calcul et la synchronisation des macros nutritionnelles.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
            {/* Queue Status Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">File d'attente</CardTitle>
                <Layers className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoadingQueue ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold">{queueCount}</span>
                    <span className="text-muted-foreground">recettes en attente</span>
                  </div>
                )}
                {queueCount === 0 ? (
                  <div className="flex items-center gap-1 mt-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm">Queue vide</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 mt-2 text-amber-600">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">En attente de traitement</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Coverage Card */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Couverture Store</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoadingCoverage ? (
                  <>
                    <Skeleton className="h-8 w-24 mb-2" />
                    <Skeleton className="h-2 w-full" />
                  </>
                ) : coverage ? (
                  <>
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-3xl font-bold">{coverage.coverage_percent}%</span>
                      <span className="text-muted-foreground text-sm">
                        ({coverage.with_macros}/{coverage.total_store})
                      </span>
                    </div>
                    <Progress value={coverage.coverage_percent} className="h-2" />
                  </>
                ) : (
                  <span className="text-muted-foreground">Données non disponibles</span>
                )}
              </CardContent>
            </Card>

            {/* Refresh Stats */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Actualisation</CardTitle>
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Actualiser les statistiques en temps réel.
                </p>
                <Button
                  onClick={refreshStats}
                  variant="outline"
                  size="sm"
                  disabled={isLoadingCoverage || isLoadingQueue}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${(isLoadingCoverage || isLoadingQueue) ? 'animate-spin' : ''}`} />
                  Actualiser stats
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Actions Grid */}
          <div className="grid gap-6 md:grid-cols-2 mb-8">
            {/* Process Queue Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5" />
                  Traiter la queue
                </CardTitle>
                <CardDescription>
                  Exécute le calcul des macros pour les recettes en attente.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => processQueue(200)}
                    disabled={isProcessing || queueCount === 0}
                    variant="default"
                  >
                    {isProcessing ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    Traiter 200
                  </Button>
                  <Button
                    onClick={() => processBatch(200)}
                    disabled={isProcessing || queueCount === 0}
                    variant="secondary"
                  >
                    {isProcessing ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Zap className="h-4 w-4 mr-2" />
                    )}
                    Traiter 1000 (batch)
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Le mode batch exécute jusqu'à 5 itérations de 200 recettes avec un délai de 1s entre chaque.
                </p>
              </CardContent>
            </Card>

            {/* Refresh MV2 Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Vue Matérialisée
                </CardTitle>
                <CardDescription>
                  Rafraîchit recipe_macros_mv2 pour synchroniser les données.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={refreshMV2}
                  disabled={isRefreshing}
                  variant="outline"
                >
                  {isRefreshing ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Refresh MV2
                </Button>
                <p className="text-xs text-muted-foreground">
                  Cette opération peut prendre quelques secondes. La vue sera mise à jour de manière concurrente (sans blocage des lectures).
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Info Card */}
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-lg">Architecture des Macros</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                <li><strong>recipe_macros_queue</strong> : File d'attente des recettes à traiter</li>
                <li><strong>recipe_macros_store</strong> : Données calculées persistées</li>
                <li><strong>recipe_macros_mv2</strong> : Vue matérialisée pour les lectures rapides</li>
                <li><strong>process_recipe_macros_queue()</strong> : Fonction de traitement batch</li>
                <li><strong>compute_recipe_macros()</strong> : Fonction de calcul unitaire</li>
              </ul>
              <p className="mt-4 text-sm text-muted-foreground">
                Le front-end utilise exclusivement des lectures via RPC/MV2. Les recalculs sont déclenchés uniquement depuis cette interface admin.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
