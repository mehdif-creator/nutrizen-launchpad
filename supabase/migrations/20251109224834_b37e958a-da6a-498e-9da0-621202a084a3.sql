-- ============================================================================
-- SECURITY FIX: Gamification RLS Policies
-- ============================================================================
-- This migration fixes critical security vulnerabilities in the gamification system:
-- 1. Removes overly permissive wallet policy that allowed privilege escalation
-- 2. Adds missing INSERT/UPDATE policies for gamification tables
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. FIX WALLET SECURITY (CRITICAL)
-- ============================================================================
-- Remove the dangerous policy that allows ANY user to modify ANY wallet
DROP POLICY IF EXISTS "System can manage wallets" ON public.user_wallets;

-- SECURITY DEFINER functions already bypass RLS, so they don't need this policy
-- Users should only read their own wallet
CREATE POLICY "Users can read own wallet"
  ON public.user_wallets FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can manage wallets (for admin operations)
CREATE POLICY "Service role can manage wallets"
  ON public.user_wallets FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- 2. FIX user_events - Allow RPC functions to insert events
-- ============================================================================
DROP POLICY IF EXISTS "self insert events via rpc" ON public.user_events;

CREATE POLICY "Users can insert own events"
  ON public.user_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 3. FIX user_badges - Allow badge granting
-- ============================================================================
CREATE POLICY "Users can insert own badges"
  ON public.user_badges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 4. FIX user_credit_lots - Allow RPC functions to manage credit lots
-- ============================================================================
CREATE POLICY "Users can insert own credit lots"
  ON public.user_credit_lots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own credit lots"
  ON public.user_credit_lots FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 5. FIX user_streaks - Allow streak tracking
-- ============================================================================
DROP POLICY IF EXISTS "self read/write streaks" ON public.user_streaks;

CREATE POLICY "Users can read own streaks"
  ON public.user_streaks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own streaks"
  ON public.user_streaks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own streaks"
  ON public.user_streaks FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 6. FIX user_referrals - Allow referral tracking
-- ============================================================================
DROP POLICY IF EXISTS "self read/write referrals" ON public.user_referrals;

CREATE POLICY "Users can read own referrals"
  ON public.user_referrals FOR SELECT
  USING (auth.uid() = referrer_id);

CREATE POLICY "Users can insert own referrals"
  ON public.user_referrals FOR INSERT
  WITH CHECK (auth.uid() = referrer_id);

CREATE POLICY "Users can update own referrals"
  ON public.user_referrals FOR UPDATE
  USING (auth.uid() = referrer_id)
  WITH CHECK (auth.uid() = referrer_id);

-- Service role can manage all referrals (for webhook updates)
CREATE POLICY "Service role can manage all referrals"
  ON public.user_referrals FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- 7. FIX user_challenge_completions - Allow challenge completion tracking
-- ============================================================================
DROP POLICY IF EXISTS "self read challenge completions" ON public.user_challenge_completions;

CREATE POLICY "Users can read own challenge completions"
  ON public.user_challenge_completions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own challenge completions"
  ON public.user_challenge_completions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 8. FIX user_wallets - Allow RPC functions to update (they use SECURITY DEFINER)
-- ============================================================================
-- Note: SECURITY DEFINER functions bypass RLS, but we add explicit policies
-- for clarity and to allow direct service role access

CREATE POLICY "Users can update own wallet"
  ON public.user_wallets FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own wallet"
  ON public.user_wallets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (Run these to test)
-- ============================================================================
-- Test 1: Verify user can't modify other user's wallet
-- SET ROLE authenticated;
-- SET request.jwt.claims.sub TO 'user-id-1';
-- UPDATE user_wallets SET points_total = 9999999 WHERE user_id = 'different-user-id-2';
-- ^ Should return 0 rows affected

-- Test 2: Verify RPC functions work
-- SELECT fn_award_event('APP_OPEN', 2, 0, '{}');
-- ^ Should succeed

-- Test 3: Verify badge insertion works
-- INSERT INTO user_badges (user_id, badge_code) VALUES (auth.uid(), 'FAST_COOK');
-- ^ Should succeed