-- Grant EXECUTE on is_admin() to authenticated (and anon for safety)
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;
