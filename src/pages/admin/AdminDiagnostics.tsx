import { useState } from 'react';
import { AppFooter } from '@/components/app/AppFooter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Loader2, Play, CheckCircle2, XCircle, ChevronDown, ChevronRight, History, RefreshCw } from 'lucide-react';
import { useDiagnostics, AVAILABLE_TESTS, DiagnosticsResult, DiagnosticsRun } from '@/hooks/useDiagnostics';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

function TestResultCard({ result }: { result: DiagnosticsResult }) {
  const [isOpen, setIsOpen] = useState(false);
  const isPassing = result.status === 'pass';
  const testInfo = AVAILABLE_TESTS.find((t) => t.key === result.test_key);

  return (
    <Card className={`border-l-4 ${isPassing ? 'border-l-green-500' : 'border-l-red-500'}`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isPassing ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <div>
                  <CardTitle className="text-base font-medium">
                    {testInfo?.label || result.test_key}
                  </CardTitle>
                  <CardDescription className="text-sm">
                    {(result.details.message_fr as string) || 'Aucun message'}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={isPassing ? 'default' : 'destructive'}>
                  {isPassing ? 'PASS' : 'FAIL'}
                </Badge>
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="bg-muted rounded-md p-3 overflow-x-auto">
              <pre className="text-xs whitespace-pre-wrap">
                {JSON.stringify(result.details, null, 2)}
              </pre>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function HistoryItem({ run, onViewDetails }: { run: DiagnosticsRun; onViewDetails: (run: DiagnosticsRun) => void }) {
  const statusColors = {
    running: 'bg-blue-500',
    success: 'bg-green-500',
    error: 'bg-red-500',
  };

  const statusLabels = {
    running: 'En cours',
    success: 'Succès',
    error: 'Erreur',
  };

  return (
    <div
      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
      onClick={() => onViewDetails(run)}
    >
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full ${statusColors[run.status]}`} />
        <div>
          <div className="text-sm font-medium">
            {format(new Date(run.started_at), 'dd MMM yyyy HH:mm', { locale: fr })}
          </div>
          <div className="text-xs text-muted-foreground">
            {run.summary?.total_tests || 0} tests • {run.summary?.pass_count || 0} réussis • {run.summary?.fail_count || 0} échecs
          </div>
        </div>
      </div>
      <Badge variant={run.status === 'success' ? 'default' : run.status === 'error' ? 'destructive' : 'secondary'}>
        {statusLabels[run.status]}
      </Badge>
    </div>
  );
}

export default function AdminDiagnostics() {
  const {
    selectedTests,
    toggleTest,
    selectAllTests,
    deselectAllTests,
    runTests,
    getRunResults,
    historyQuery,
    isRunning,
    lastRunResults,
  } = useDiagnostics();

  const [selectedRun, setSelectedRun] = useState<DiagnosticsRun | null>(null);
  const [selectedRunResults, setSelectedRunResults] = useState<DiagnosticsResult[]>([]);
  const [loadingRunResults, setLoadingRunResults] = useState(false);

  const handleViewRunDetails = async (run: DiagnosticsRun) => {
    setSelectedRun(run);
    setLoadingRunResults(true);
    try {
      const results = await getRunResults(run.id);
      setSelectedRunResults(results);
    } catch (error) {
      console.error('Error loading run results:', error);
      setSelectedRunResults([]);
    } finally {
      setLoadingRunResults(false);
    }
  };

  const clearSelectedRun = () => {
    setSelectedRun(null);
    setSelectedRunResults([]);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Diagnostics</h1>
          <p className="text-muted-foreground mt-2">
            Lancez une série de tests automatiques pour vérifier Supabase, les images, le profil, le dashboard et les données.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Test Selection Panel */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Tests disponibles</CardTitle>
              <CardDescription>Sélectionnez les tests à exécuter</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={selectAllTests}>
                    Tout sélectionner
                  </Button>
                  <Button variant="outline" size="sm" onClick={deselectAllTests}>
                    Tout décocher
                  </Button>
                </div>

                <div className="space-y-3">
                  {AVAILABLE_TESTS.map((test) => (
                    <div key={test.key} className="flex items-start space-x-3">
                      <Checkbox
                        id={test.key}
                        checked={selectedTests.includes(test.key)}
                        onCheckedChange={() => toggleTest(test.key)}
                      />
                      <div className="grid gap-0.5 leading-none">
                        <label
                          htmlFor={test.key}
                          className="text-sm font-medium cursor-pointer"
                        >
                          {test.label}
                        </label>
                        <p className="text-xs text-muted-foreground">
                          {test.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <Button
                  className="w-full"
                  onClick={runTests}
                  disabled={isRunning || selectedTests.length === 0}
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Tests en cours...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Lancer les tests ({selectedTests.length})
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Results Panel */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">
                    {selectedRun ? 'Détails du run' : 'Résultats'}
                  </CardTitle>
                  <CardDescription>
                    {selectedRun
                      ? format(new Date(selectedRun.started_at), 'dd MMMM yyyy à HH:mm', { locale: fr })
                      : lastRunResults
                      ? `${lastRunResults.summary.pass_count}/${lastRunResults.summary.total_tests} tests réussis`
                      : 'Lancez les tests pour voir les résultats'}
                  </CardDescription>
                </div>
                {selectedRun && (
                  <Button variant="outline" size="sm" onClick={clearSelectedRun}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Voir derniers résultats
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isRunning && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                  <p className="text-muted-foreground">Exécution des tests en cours...</p>
                </div>
              )}

              {!isRunning && loadingRunResults && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                  <p className="text-muted-foreground">Chargement des résultats...</p>
                </div>
              )}

              {!isRunning && !loadingRunResults && selectedRun && selectedRunResults.length > 0 && (
                <div className="space-y-3">
                  {selectedRunResults.map((result, index) => (
                    <TestResultCard key={index} result={result} />
                  ))}
                </div>
              )}

              {!isRunning && !loadingRunResults && !selectedRun && lastRunResults && (
                <div className="space-y-3">
                  {lastRunResults.results.map((result, index) => (
                    <TestResultCard key={index} result={result} />
                  ))}
                </div>
              )}

              {!isRunning && !loadingRunResults && !selectedRun && !lastRunResults && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="text-muted-foreground">
                    <Play className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>Aucun résultat pour le moment.</p>
                    <p className="text-sm">Sélectionnez des tests et cliquez sur "Lancer les tests".</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* History Section */}
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5" />
                <CardTitle className="text-lg">Historique</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => historyQuery.refetch()}
                disabled={historyQuery.isFetching}
              >
                <RefreshCw className={`h-4 w-4 ${historyQuery.isFetching ? 'animate-spin' : ''}`} />
              </Button>
            </div>
            <CardDescription>Dernières exécutions des diagnostics</CardDescription>
          </CardHeader>
          <CardContent>
            {historyQuery.isLoading && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            )}

            {historyQuery.isError && (
              <div className="text-center py-8 text-muted-foreground">
                <p>Erreur lors du chargement de l'historique.</p>
              </div>
            )}

            {historyQuery.isSuccess && historyQuery.data.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>Aucun historique disponible.</p>
              </div>
            )}

            {historyQuery.isSuccess && historyQuery.data.length > 0 && (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {historyQuery.data.map((run) => (
                  <HistoryItem key={run.id} run={run} onViewDetails={handleViewRunDetails} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <AppFooter />
    </div>
  );
}
