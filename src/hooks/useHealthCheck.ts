import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface HealthCheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  details?: Record<string, unknown>;
  duration_ms: number;
}

export interface HealthCheckResponse {
  status: 'pass' | 'fail' | 'warn';
  summary: { total: number; pass: number; fail: number; warn: number };
  checks: HealthCheckResult[];
  run_at: string;
}

export function useHealthCheck() {
  const { toast } = useToast();

  const runHealthCheck = useMutation({
    mutationFn: async (checks?: string[]): Promise<HealthCheckResponse> => {
      const { data, error } = await supabase.functions.invoke<HealthCheckResponse>('health-check', {
        body: checks ? { checks } : {},
      });
      if (error) throw new Error(error.message || 'Health check failed');
      return data!;
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Fetch recent health check history
  const historyQuery = useQuery({
    queryKey: ['health-check-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('health_checks')
        .select('*')
        .order('run_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  // Fetch active alerts
  const alertsQuery = useQuery({
    queryKey: ['system-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_active_alerts');
      if (error) throw error;
      return data;
    },
  });

  return {
    runHealthCheck,
    isRunning: runHealthCheck.isPending,
    lastResult: runHealthCheck.data,
    historyQuery,
    alertsQuery,
  };
}
