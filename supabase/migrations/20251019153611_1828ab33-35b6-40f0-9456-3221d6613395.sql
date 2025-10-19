-- Add admin SELECT policy to profiles table
-- This allows admins to view all user profiles in the admin dashboard
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));