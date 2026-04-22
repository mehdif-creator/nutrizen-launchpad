-- Restrict Supabase Realtime channel authorization to owner-scoped topics and admin-only topics
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can receive own realtime updates" ON realtime.messages;
DROP POLICY IF EXISTS "Admins can receive admin realtime updates" ON realtime.messages;

CREATE POLICY "Authenticated users can receive own realtime updates"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() IN (
    'weekly_recipes_changes_' || auth.uid()::text,
    'user-wallet-' || auth.uid()::text,
    'credits_changes_' || auth.uid()::text,
    'user_weekly_menus_changes_' || auth.uid()::text,
    'dashboard-' || auth.uid()::text,
    'user-menu-' || auth.uid()::text,
    'user-stats-' || auth.uid()::text,
    'user-gamification-' || auth.uid()::text,
    'gam-state-' || auth.uid()::text,
    'user-events-' || auth.uid()::text
  )
);

CREATE POLICY "Admins can receive admin realtime updates"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() = 'admin_dashboard_changes'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Restrict direct reads of gamification state to the owner/admin.
-- Public leaderboard data remains available only through public.get_leaderboard(),
-- which filters by profiles.show_on_leaderboard.
DROP POLICY IF EXISTS "Leaderboard gamification state readable" ON public.user_gamification_state;
DROP POLICY IF EXISTS "Users can read own gamification state" ON public.user_gamification_state;
DROP POLICY IF EXISTS "Admins can read gamification state" ON public.user_gamification_state;

CREATE POLICY "Users can read own gamification state"
ON public.user_gamification_state
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can read gamification state"
ON public.user_gamification_state
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Remove broad public SELECT policies that allow listing objects in public buckets.
-- Public bucket file URLs remain usable by known path, but anonymous clients can no longer list all objects.
DROP POLICY IF EXISTS "Public read access for recipe images" ON storage.objects;
DROP POLICY IF EXISTS "Public read seo-images" ON storage.objects;