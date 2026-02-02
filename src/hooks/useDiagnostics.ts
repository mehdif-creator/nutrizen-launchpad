import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DiagnosticsResult {
  test_key: string;
  status: 'pass' | 'fail';
  details: Record<string, unknown>;
}

export interface DiagnosticsRun {
  id: string;
  admin_user_id: string;
  environment: string;
  started_at: string;
  finished_at: string | null;
  status: 'running' | 'success' | 'error';
  summary: {
    total_tests?: number;
    pass_count?: number;
    fail_count?: number;
  } | null;
  error: string | null;
}

export interface DiagnosticsRunResponse {
  run_id: string;
  status: 'success' | 'error';
  summary: {
    total_tests: number;
    pass_count: number;
    fail_count: number;
  };
  results: DiagnosticsResult[];
}

export const AVAILABLE_TESTS = [
  { key: 'storage_images', label: 'Images Stockage', description: 'Vérifie l\'accessibilité des images de recettes' },
  { key: 'profile_upsert', label: 'Profil Utilisateur', description: 'Teste l\'écriture et lecture du profil' },
  { key: 'advice_of_day', label: 'Conseil du Jour', description: 'Vérifie la table daily_advice' },
  { key: 'dashboard_rpc', label: 'Dashboard RPC', description: 'Valide le contrat rpc_get_user_dashboard' },
  { key: 'week_structure', label: 'Structure Semaine', description: 'Vérifie les créneaux déjeuner/dîner' },
  { key: 'realtime_refresh', label: 'Rafraîchissement', description: 'Teste la mise à jour automatique' },
] as const;

export function useDiagnostics() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTests, setSelectedTests] = useState<string[]>(
    AVAILABLE_TESTS.map((t) => t.key)
  );

  // Fetch run history
  const historyQuery = useQuery({
    queryKey: ['diagnostics-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('diagnostics_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as DiagnosticsRun[];
    },
  });

  // Fetch results for a specific run
  const getRunResults = async (runId: string): Promise<DiagnosticsResult[]> => {
    const { data, error } = await supabase
      .from('diagnostics_results')
      .select('*')
      .eq('run_id', runId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data as DiagnosticsResult[];
  };

  // Run diagnostics mutation
  const runDiagnosticsMutation = useMutation({
    mutationFn: async (tests: string[]): Promise<DiagnosticsRunResponse> => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('Non authentifié');
      }

      const response = await supabase.functions.invoke<DiagnosticsRunResponse>('qa-runner', {
        body: {
          environment: 'prod',
          tests,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erreur lors des tests');
      }

      return response.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diagnostics-history'] });
      toast({
        title: 'Tests terminés',
        description: 'Les résultats sont disponibles.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible d\'exécuter les tests.',
        variant: 'destructive',
      });
    },
  });

  const toggleTest = (testKey: string) => {
    setSelectedTests((prev) =>
      prev.includes(testKey)
        ? prev.filter((t) => t !== testKey)
        : [...prev, testKey]
    );
  };

  const selectAllTests = () => {
    setSelectedTests(AVAILABLE_TESTS.map((t) => t.key));
  };

  const deselectAllTests = () => {
    setSelectedTests([]);
  };

  const runTests = () => {
    if (selectedTests.length === 0) {
      toast({
        title: 'Aucun test sélectionné',
        description: 'Veuillez sélectionner au moins un test.',
        variant: 'destructive',
      });
      return;
    }
    runDiagnosticsMutation.mutate(selectedTests);
  };

  return {
    // State
    selectedTests,
    // Actions
    toggleTest,
    selectAllTests,
    deselectAllTests,
    runTests,
    getRunResults,
    // Queries
    historyQuery,
    // Mutation state
    isRunning: runDiagnosticsMutation.isPending,
    lastRunResults: runDiagnosticsMutation.data,
    runError: runDiagnosticsMutation.error,
  };
}
