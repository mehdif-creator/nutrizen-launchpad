-- Grant execute on the no-args is_admin() to authenticated role
-- This is the SECURITY DEFINER version that AuthContext calls via supabase.rpc('is_admin')
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
