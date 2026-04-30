
-- Fix 1: Restrict referrals UPDATE to authenticated users and remove the "referred_id IS NULL" public claim path.
DROP POLICY IF EXISTS "Users can complete referrals for themselves" ON public.referrals;
CREATE POLICY "Users can complete referrals for themselves"
ON public.referrals
FOR UPDATE
TO authenticated
USING (auth.uid() = referred_id)
WITH CHECK (auth.uid() = referred_id);

-- Fix 2: Remove direct user UPDATE on user_gamification (privilege escalation). Updates must go through service role / SECURITY DEFINER RPCs.
DROP POLICY IF EXISTS "Users can update own gamification" ON public.user_gamification;

-- Fix 3: Restrict email_events SELECT to authenticated role only.
DROP POLICY IF EXISTS "Users can view own email_events" ON public.email_events;
CREATE POLICY "Users can view own email_events"
ON public.email_events
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
