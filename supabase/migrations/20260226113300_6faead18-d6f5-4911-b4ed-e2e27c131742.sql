-- ============================================================
-- FIX: Remove is_admin(uuid) overload causing PostgREST issues
-- Step 1: Drop ALL dependent policies first
-- Step 2: Drop the function
-- Step 3: Recreate policies with has_role
-- Step 4: Recreate is_admin() 0-arg to use user_roles
-- ============================================================

-- Drop ALL policies that depend on is_admin(uuid)
DROP POLICY IF EXISTS "admin read board map" ON public.pinterest_board_map;
DROP POLICY IF EXISTS "admin write board map" ON public.pinterest_board_map;
DROP POLICY IF EXISTS "admin read pinterest_board_map" ON public.pinterest_board_map;
DROP POLICY IF EXISTS "admin write pinterest_board_map" ON public.pinterest_board_map;
DROP POLICY IF EXISTS "pinterest_board_map_admin_only_select" ON public.pinterest_board_map;
DROP POLICY IF EXISTS "pinterest_board_map_admin_only_write" ON public.pinterest_board_map;

DROP POLICY IF EXISTS "admin read social queue" ON public.social_queue;
DROP POLICY IF EXISTS "admin write social queue" ON public.social_queue;
DROP POLICY IF EXISTS "admin read social_queue" ON public.social_queue;
DROP POLICY IF EXISTS "admin write social_queue" ON public.social_queue;
DROP POLICY IF EXISTS "social_queue_admin_only_select" ON public.social_queue;
DROP POLICY IF EXISTS "social_queue_admin_only_write" ON public.social_queue;

DROP POLICY IF EXISTS "admin can read pinterest_oauth" ON public.pinterest_oauth;
DROP POLICY IF EXISTS "admin can upsert pinterest_oauth" ON public.pinterest_oauth;
DROP POLICY IF EXISTS "pinterest_oauth_admin_only_select" ON public.pinterest_oauth;
DROP POLICY IF EXISTS "pinterest_oauth_admin_only_write" ON public.pinterest_oauth;

-- Now drop the 1-arg overload
DROP FUNCTION IF EXISTS public.is_admin(uuid);

-- Recreate is_admin() 0-arg to use user_roles (canonical source)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;

-- Recreate policies using has_role instead
CREATE POLICY "pinterest_board_map_admin_select" ON public.pinterest_board_map
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "pinterest_board_map_admin_all" ON public.pinterest_board_map
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "social_queue_admin_select" ON public.social_queue
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "social_queue_admin_all" ON public.social_queue
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "pinterest_oauth_admin_select" ON public.pinterest_oauth
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "pinterest_oauth_admin_all" ON public.pinterest_oauth
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
