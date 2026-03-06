-- Create email_schedule table for onboarding email sequences
CREATE TABLE public.email_schedule (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  template_key TEXT NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending',
  error TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX idx_email_schedule_status_scheduled ON public.email_schedule (status, scheduled_at) WHERE status = 'pending';
CREATE INDEX idx_email_schedule_user_id ON public.email_schedule (user_id);

-- Enable RLS
ALTER TABLE public.email_schedule ENABLE ROW LEVEL SECURITY;

-- Only service role can access (edge functions use service role)
-- Admins can read via authenticated role
CREATE POLICY "Admins can view email_schedule"
  ON public.email_schedule
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
  );