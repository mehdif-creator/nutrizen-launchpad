-- Add session_id column to login_tokens table
ALTER TABLE public.login_tokens 
ADD COLUMN IF NOT EXISTS session_id TEXT;

-- Add index for session_id lookups
CREATE INDEX IF NOT EXISTS idx_login_tokens_session_id ON public.login_tokens(session_id);

-- Remove token unique constraint since we're using session_id as primary lookup
ALTER TABLE public.login_tokens DROP CONSTRAINT IF EXISTS login_tokens_token_key;