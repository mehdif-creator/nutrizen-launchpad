-- Fix: Enable RLS on social_queue table and add proper policies
-- This table stores internal queue data for social media posting and should not be publicly accessible

-- Enable Row Level Security
ALTER TABLE public.social_queue ENABLE ROW LEVEL SECURITY;

-- Create service-role-only policy for full access (automated systems)
CREATE POLICY "Service role can manage social queue"
ON public.social_queue
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Create admin read-only policy for monitoring purposes
CREATE POLICY "Admins can view social queue"
ON public.social_queue
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));