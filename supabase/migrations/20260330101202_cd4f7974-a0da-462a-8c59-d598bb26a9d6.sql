
-- Fix: Allow admins to read all profiles (currently only own row visible)
-- This is the root cause of /admin/users showing only 1 user
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (is_admin());
