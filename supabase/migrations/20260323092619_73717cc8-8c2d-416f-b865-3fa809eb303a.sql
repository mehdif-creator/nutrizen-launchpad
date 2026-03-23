-- Re-grant EXECUTE on check_and_consume_credits to authenticated role.
-- The function already has an internal ownership guard:
--   IF auth.uid() IS NOT NULL AND auth.uid() != p_user_id THEN RAISE EXCEPTION
-- So it is safe for authenticated users to call for their own data.
-- This was over-restricted in the security hardening pass.
GRANT EXECUTE ON FUNCTION public.check_and_consume_credits(uuid, text, integer) TO authenticated;