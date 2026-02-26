-- Allow authenticated users to call grant_welcome_credits on their own account
-- The function is SECURITY DEFINER so it runs as the function owner (safe)
-- The function is idempotent: it checks welcome_credits_granted before granting
GRANT EXECUTE ON FUNCTION public.grant_welcome_credits(uuid) TO authenticated;