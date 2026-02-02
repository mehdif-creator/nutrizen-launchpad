import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { FeatureType } from '@/lib/featureCosts';

export type JobType = 'scan_repas' | 'inspi_frigo' | 'substitutions';

export type JobStatus = 'idle' | 'queued' | 'running' | 'success' | 'error';

export interface JobResult {
  job_id: string;
  status: JobStatus;
  result?: Record<string, any>;
  error?: string;
  error_code?: string;
  current_balance?: number;
  required?: number;
}

interface UseAutomationJobOptions {
  onSuccess?: (result: Record<string, any>) => void;
  onError?: (error: string, errorCode?: string) => void;
  pollInterval?: number;
  maxPollTime?: number;
}

export function useAutomationJob(options: UseAutomationJobOptions = {}) {
  const { session } = useAuth();
  const [status, setStatus] = useState<JobStatus>('idle');
  const [jobId, setJobId] = useState<string | null>(null);
  const [result, setResult] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [creditsInfo, setCreditsInfo] = useState<{ current: number; required: number } | null>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollStartRef = useRef<number>(0);

  const {
    onSuccess,
    onError,
    pollInterval = 2000,
    maxPollTime = 120000, // 2 minutes max poll time
  } = options;

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Poll for job updates
  const pollJob = useCallback(async (id: string) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('automation_jobs')
        .select('id, status, result, error')
        .eq('id', id)
        .single();

      if (fetchError) {
        console.error('[useAutomationJob] Poll error:', fetchError);
        return;
      }

      if (data.status === 'success') {
        setStatus('success');
        setResult((data.result as Record<string, any>) || {});
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        onSuccess?.((data.result as Record<string, any>) || {});
      } else if (data.status === 'error') {
        setStatus('error');
        setError(data.error || 'Une erreur est survenue');
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        onError?.(data.error || 'Une erreur est survenue');
      } else if (data.status === 'running') {
        setStatus('running');
      }

      // Check max poll time
      if (Date.now() - pollStartRef.current > maxPollTime) {
        console.warn('[useAutomationJob] Max poll time exceeded');
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        setStatus('error');
        setError('Delai attente depasse. Reessayez plus tard.');
        onError?.('Delai attente depasse');
      }
    } catch (e) {
      console.error('[useAutomationJob] Poll exception:', e);
    }
  }, [onSuccess, onError, maxPollTime]);

  // Start a job
  const startJob = useCallback(async (
    type: JobType,
    payload: Record<string, any>,
    idempotencyKey: string
  ): Promise<JobResult | null> => {
    if (!session?.access_token) {
      toast.error('Vous devez être connecté');
      return null;
    }

    // Reset state
    setStatus('queued');
    setJobId(null);
    setResult(null);
    setError(null);
    setErrorCode(null);
    setCreditsInfo(null);

    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('start-job', {
        body: { type, payload, idempotency_key: idempotencyKey },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (invokeError) {
        console.error('[useAutomationJob] Invoke error:', invokeError);
        setStatus('error');
        setError('Erreur de communication avec le serveur');
        onError?.('Erreur de communication avec le serveur');
        return null;
      }

      // Handle insufficient credits
      if (data?.error_code === 'INSUFFICIENT_CREDITS') {
        setStatus('error');
        setError(data.error || 'Crédits insuffisants');
        setErrorCode('INSUFFICIENT_CREDITS');
        setCreditsInfo({
          current: data.current_balance || 0,
          required: data.required || 1,
        });
        return {
          job_id: '',
          status: 'error',
          error: data.error,
          error_code: 'INSUFFICIENT_CREDITS',
          current_balance: data.current_balance,
          required: data.required,
        };
      }

      // Handle other errors
      if (!data?.success) {
        setStatus('error');
        setError(data?.error || 'Erreur inconnue');
        setErrorCode(data?.error_code);
        onError?.(data?.error || 'Erreur inconnue', data?.error_code);
        return {
          job_id: data?.job_id || '',
          status: 'error',
          error: data?.error,
          error_code: data?.error_code,
        };
      }

      // Job started successfully
      const id = data.job_id;
      setJobId(id);

      // If already completed (cached result)
      if (data.status === 'success') {
        setStatus('success');
        setResult(data.result || {});
        onSuccess?.(data.result || {});
        return {
          job_id: id,
          status: 'success',
          result: data.result,
        };
      }

      // Start polling
      setStatus(data.status === 'running' ? 'running' : 'queued');
      pollStartRef.current = Date.now();
      pollIntervalRef.current = setInterval(() => pollJob(id), pollInterval);

      return {
        job_id: id,
        status: data.status,
      };

    } catch (e) {
      console.error('[useAutomationJob] Exception:', e);
      setStatus('error');
      setError('Erreur inattendue');
      onError?.('Erreur inattendue');
      return null;
    }
  }, [session, pollJob, onSuccess, onError, pollInterval]);

  // Reset to idle state
  const reset = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setStatus('idle');
    setJobId(null);
    setResult(null);
    setError(null);
    setErrorCode(null);
    setCreditsInfo(null);
  }, []);

  return {
    status,
    jobId,
    result,
    error,
    errorCode,
    creditsInfo,
    isLoading: status === 'queued' || status === 'running',
    isSuccess: status === 'success',
    isError: status === 'error',
    isInsufficientCredits: errorCode === 'INSUFFICIENT_CREDITS',
    startJob,
    reset,
  };
}
