
-- ============================================================
-- checkout_tokens: tamper-resistant post-checkout login tokens
-- ============================================================
CREATE TABLE public.checkout_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token text NOT NULL,
  email text NOT NULL,
  user_id uuid,
  plan_key text,
  stripe_session_id text,
  status text NOT NULL DEFAULT 'pending',  -- pending | ready | consumed
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  consumed_at timestamptz
);

-- Unique constraint on token for single-use guarantee
CREATE UNIQUE INDEX checkout_tokens_token_uniq ON public.checkout_tokens (token);

-- Index for lookups by stripe_session_id (webhook marks ready)
CREATE INDEX checkout_tokens_stripe_session_idx ON public.checkout_tokens (stripe_session_id) WHERE stripe_session_id IS NOT NULL;

-- Auto-cleanup: index on expires_at for efficient pruning
CREATE INDEX checkout_tokens_expires_idx ON public.checkout_tokens (expires_at);

-- Enable RLS
ALTER TABLE public.checkout_tokens ENABLE ROW LEVEL SECURITY;

-- Only service_role can touch this table (edge functions use service role)
CREATE POLICY "Service role full access"
  ON public.checkout_tokens
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Block all user access
CREATE POLICY "Block user access"
  ON public.checkout_tokens
  FOR ALL
  USING (false)
  WITH CHECK (false);
