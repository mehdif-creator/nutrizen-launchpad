
CREATE OR REPLACE FUNCTION public.verify_marketing_sync_secret(p_secret text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_expected text;
BEGIN
  SELECT value INTO v_expected
  FROM private.app_settings
  WHERE key = 'marketing_sync_internal_secret';

  IF v_expected IS NULL OR p_secret IS NULL OR length(p_secret) = 0 THEN
    RETURN false;
  END IF;

  -- length-prefixed equality (timing leak limited to length)
  RETURN length(v_expected) = length(p_secret)
     AND v_expected = p_secret;
END;
$$;

REVOKE ALL ON FUNCTION public.verify_marketing_sync_secret(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_marketing_sync_secret(text) TO service_role;
