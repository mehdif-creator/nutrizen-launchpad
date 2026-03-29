
-- 1. BACKUP TABLE: Enable RLS with deny-all (no one needs client access)
ALTER TABLE public.manual_social_posts_backup_20260328 ENABLE ROW LEVEL SECURITY;

-- 2. LEADERBOARD PROFILE EXPOSURE: Replace broad leaderboard SELECT policy
-- The gamification_leaderboard view (SECURITY INVOKER + joins only display_name/avatar_url)
-- is the correct way to access leaderboard data. The profiles policy should not
-- allow reading ALL columns for leaderboard users.
DROP POLICY IF EXISTS "Leaderboard profiles are readable" ON public.profiles;

-- Re-create a safe version: users can only read their own profile
-- (other policies like "Users can view own profile" may already exist, 
--  but this ensures the leaderboard hole is closed)
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- 3. USER_POINTS: Remove user self-update capability (points should only be modified by service_role/admin)
DROP POLICY IF EXISTS "Users can manage own points" ON public.user_points;
DROP POLICY IF EXISTS "Users can update own points" ON public.user_points;

-- Keep SELECT for users to view their own points
-- (policy "Users can view own points" already exists)

-- 4. SECURITY DEFINER VIEW: Set v_manual_social_posts_admin to security_invoker
ALTER VIEW public.v_manual_social_posts_admin SET (security_invoker = true);
