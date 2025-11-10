-- Add explicit policy to login_tokens table to document access intent
-- This table should only be accessible via service role, not by regular users

-- Add explicit denial policy for authenticated users
CREATE POLICY "No direct user access to login tokens"
ON public.login_tokens
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

-- Add comment to document the security design
COMMENT ON TABLE public.login_tokens IS 'One-time login tokens for post-checkout authentication. Only accessible via service role. RLS explicitly denies all user access.';