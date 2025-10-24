-- Create table to track processed checkout sessions (prevent replay attacks)
CREATE TABLE IF NOT EXISTS public.processed_checkout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL UNIQUE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  payment_status text NOT NULL,
  processed_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.processed_checkout_sessions ENABLE ROW LEVEL SECURITY;

-- Create index for fast lookups
CREATE INDEX idx_processed_checkout_sessions_session_id ON public.processed_checkout_sessions(session_id);
CREATE INDEX idx_processed_checkout_sessions_created_at ON public.processed_checkout_sessions(created_at);

-- RLS Policies: Only service role can manage this table
CREATE POLICY "Service role can manage processed sessions"
ON public.processed_checkout_sessions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Admins can view processed sessions for debugging
CREATE POLICY "Admins can view processed sessions"
ON public.processed_checkout_sessions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

-- Create cleanup function to remove old sessions (older than 30 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_checkout_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.processed_checkout_sessions
  WHERE created_at < now() - interval '30 days';
END;
$$;