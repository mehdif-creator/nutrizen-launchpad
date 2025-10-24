-- Table pour stocker les tokens de connexion one-time post-checkout
CREATE TABLE IF NOT EXISTS public.login_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_login_tokens_email_token ON public.login_tokens(email, token);
CREATE INDEX IF NOT EXISTS idx_login_tokens_expires ON public.login_tokens(expires_at);

-- RLS: personne ne peut lire directement (seulement via service role)
ALTER TABLE public.login_tokens ENABLE ROW LEVEL SECURITY;

-- Cleanup des tokens expirés (exécuté périodiquement)
CREATE OR REPLACE FUNCTION public.cleanup_expired_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.login_tokens
  WHERE expires_at < NOW();
END;
$$;
