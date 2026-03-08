
-- Allow authenticated users to read profiles where show_on_leaderboard is true
-- (only display_name and avatar_url are exposed via the view)
CREATE POLICY "Leaderboard profiles are readable"
  ON public.profiles FOR SELECT TO authenticated
  USING (show_on_leaderboard = true OR id = auth.uid());

-- Drop the old restrictive policy and replace
DROP POLICY IF EXISTS "Authenticated can read profiles" ON public.profiles;

-- Allow authenticated users to read all gamification state for leaderboard
CREATE POLICY "Leaderboard gamification state readable"
  ON public.user_gamification_state FOR SELECT TO authenticated
  USING (true);

-- Drop old policy
DROP POLICY IF EXISTS "Users read own gamification state" ON public.user_gamification_state;
