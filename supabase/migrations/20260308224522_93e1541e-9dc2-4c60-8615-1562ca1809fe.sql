
-- Fix 1: Rate limiting table + token-bucket RPC
CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
  identifier TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  tokens NUMERIC NOT NULL DEFAULT 60,
  last_refill TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (identifier, endpoint)
);
ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only" ON public.rate_limit_buckets USING (false);

-- Token-bucket rate limit function matching the expected RPC signature
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier TEXT,
  p_endpoint TEXT,
  p_max_tokens INT DEFAULT 60,
  p_refill_rate INT DEFAULT 60,
  p_cost INT DEFAULT 1
) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tokens NUMERIC;
  v_last TIMESTAMPTZ;
  v_now TIMESTAMPTZ := NOW();
  v_elapsed NUMERIC;
  v_new_tokens NUMERIC;
  v_retry_after NUMERIC;
BEGIN
  -- Upsert bucket
  INSERT INTO rate_limit_buckets (identifier, endpoint, tokens, last_refill)
  VALUES (p_identifier, p_endpoint, p_max_tokens, v_now)
  ON CONFLICT (identifier, endpoint) DO NOTHING;

  -- Lock and read
  SELECT tokens, last_refill INTO v_tokens, v_last
  FROM rate_limit_buckets
  WHERE identifier = p_identifier AND endpoint = p_endpoint
  FOR UPDATE;

  -- Refill tokens based on elapsed time
  v_elapsed := EXTRACT(EPOCH FROM v_now - v_last);
  v_new_tokens := LEAST(p_max_tokens, v_tokens + (v_elapsed * p_refill_rate / 60.0));

  -- Check if enough tokens
  IF v_new_tokens < p_cost THEN
    v_retry_after := CEIL((p_cost - v_new_tokens) / GREATEST(p_refill_rate / 60.0, 0.01));
    UPDATE rate_limit_buckets SET tokens = v_new_tokens, last_refill = v_now
    WHERE identifier = p_identifier AND endpoint = p_endpoint;
    RETURN json_build_object('allowed', false, 'tokens_remaining', FLOOR(v_new_tokens), 'retry_after', v_retry_after);
  END IF;

  -- Consume tokens
  UPDATE rate_limit_buckets SET tokens = v_new_tokens - p_cost, last_refill = v_now
  WHERE identifier = p_identifier AND endpoint = p_endpoint;

  RETURN json_build_object('allowed', true, 'tokens_remaining', FLOOR(v_new_tokens - p_cost), 'retry_after', NULL);
END;
$$;

-- Grant execute to authenticated and anon
GRANT EXECUTE ON FUNCTION public.check_rate_limit TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit TO anon;
GRANT EXECUTE ON FUNCTION public.check_rate_limit TO service_role;

-- Fix 3: Edge function errors table
CREATE TABLE IF NOT EXISTS public.edge_function_errors (
  id BIGSERIAL PRIMARY KEY,
  function_name TEXT NOT NULL,
  error_message TEXT,
  error_stack TEXT,
  user_id UUID,
  request_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.edge_function_errors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only" ON public.edge_function_errors USING (false);

-- Cleanup job: auto-delete rate limit buckets older than 1 hour (optional index)
CREATE INDEX IF NOT EXISTS idx_rate_limit_buckets_last_refill ON rate_limit_buckets(last_refill);
