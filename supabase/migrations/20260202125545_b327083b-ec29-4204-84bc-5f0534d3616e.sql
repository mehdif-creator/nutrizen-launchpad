-- Create diagnostics_runs table for storing QA run metadata
CREATE TABLE public.diagnostics_runs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id uuid NOT NULL,
    environment text NOT NULL DEFAULT 'prod',
    started_at timestamptz NOT NULL DEFAULT now(),
    finished_at timestamptz,
    status text NOT NULL CHECK (status IN ('running', 'success', 'error')) DEFAULT 'running',
    summary jsonb DEFAULT '{}'::jsonb,
    error text
);

-- Create diagnostics_results table for storing individual test results
CREATE TABLE public.diagnostics_results (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id uuid NOT NULL REFERENCES public.diagnostics_runs(id) ON DELETE CASCADE,
    test_key text NOT NULL,
    status text NOT NULL CHECK (status IN ('pass', 'fail')),
    details jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX idx_diagnostics_runs_admin ON public.diagnostics_runs(admin_user_id);
CREATE INDEX idx_diagnostics_runs_started ON public.diagnostics_runs(started_at DESC);
CREATE INDEX idx_diagnostics_results_run ON public.diagnostics_results(run_id);

-- Enable RLS on both tables
ALTER TABLE public.diagnostics_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnostics_results ENABLE ROW LEVEL SECURITY;

-- RLS policies for diagnostics_runs: admins can view their own runs
CREATE POLICY "Admins can view own diagnostics runs"
ON public.diagnostics_runs
FOR SELECT
TO authenticated
USING (
    admin_user_id = auth.uid() 
    AND has_role(auth.uid(), 'admin'::app_role)
);

-- Service role can manage all runs (for edge function)
CREATE POLICY "Service role can manage diagnostics runs"
ON public.diagnostics_runs
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- RLS policies for diagnostics_results: admins can view results of their runs
CREATE POLICY "Admins can view own diagnostics results"
ON public.diagnostics_results
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.diagnostics_runs dr
        WHERE dr.id = run_id 
        AND dr.admin_user_id = auth.uid()
        AND has_role(auth.uid(), 'admin'::app_role)
    )
);

-- Service role can manage all results (for edge function)
CREATE POLICY "Service role can manage diagnostics results"
ON public.diagnostics_results
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');