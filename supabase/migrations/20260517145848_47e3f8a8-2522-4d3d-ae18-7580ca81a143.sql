
-- user_gamification_state: remove ALL policy that allowed self-writes
DROP POLICY IF EXISTS "System can manage gamification state" ON public.user_gamification_state;
-- (SELECT policy "Users can read own gamification state" and admin SELECT remain)
CREATE POLICY "Service role can manage gamification state"
  ON public.user_gamification_state
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- user_credit_lots: remove user-facing INSERT/UPDATE
DROP POLICY IF EXISTS "Users can insert own credit lots" ON public.user_credit_lots;
DROP POLICY IF EXISTS "Users can update own credit lots" ON public.user_credit_lots;

-- user_events: remove user-facing INSERT
DROP POLICY IF EXISTS "Users can insert own events" ON public.user_events;

-- user_streaks: remove user-facing INSERT/UPDATE
DROP POLICY IF EXISTS "Users can insert own streaks" ON public.user_streaks;
DROP POLICY IF EXISTS "Users can update own streaks" ON public.user_streaks;
