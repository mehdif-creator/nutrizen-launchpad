
-- =============================================
-- SECURITY FIX: Restrict table access to authenticated users only
-- Fixes: profiles, preferences, subscriptions, affiliate_conversions, login_tokens
-- =============================================

-- =============================================
-- 1. PROFILES TABLE - Remove duplicate policies and ensure proper access control
-- =============================================

-- Drop duplicate/redundant policies
DROP POLICY IF EXISTS "read own profile" ON public.profiles;
DROP POLICY IF EXISTS "update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Recreate with explicit auth.uid() IS NOT NULL checks
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- 2. PREFERENCES TABLE - Ensure only authenticated users access their own data
-- =============================================

DROP POLICY IF EXISTS "Users can manage own preferences" ON public.preferences;

CREATE POLICY "Users can view own preferences"
ON public.preferences
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
ON public.preferences
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
ON public.preferences
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own preferences"
ON public.preferences
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- =============================================
-- 3. SUBSCRIPTIONS TABLE - Restrict to authenticated users
-- =============================================

DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can insert own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "read own subs" ON public.subscriptions;

CREATE POLICY "Users can view own subscription"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscription"
ON public.subscriptions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription"
ON public.subscriptions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admins need to view subscriptions for admin panel
CREATE POLICY "Admins can view all subscriptions"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role can manage all subscriptions (for webhooks, etc.)
CREATE POLICY "Service role can manage subscriptions"
ON public.subscriptions
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- =============================================
-- 4. AFFILIATE_CONVERSIONS TABLE - Restrict to authenticated affiliates only
-- =============================================

DROP POLICY IF EXISTS "Affiliates can view own conversions" ON public.affiliate_conversions;
DROP POLICY IF EXISTS "Service role can manage conversions" ON public.affiliate_conversions;

CREATE POLICY "Affiliates can view own conversions"
ON public.affiliate_conversions
FOR SELECT
TO authenticated
USING (auth.uid() = affiliate_user_id);

CREATE POLICY "Service role can manage conversions"
ON public.affiliate_conversions
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- =============================================
-- 5. LOGIN_TOKENS TABLE - Allow service role access while blocking user access
-- =============================================

DROP POLICY IF EXISTS "No direct user access to login tokens" ON public.login_tokens;

-- Block all user access (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Block user access to login tokens"
ON public.login_tokens
FOR ALL
TO authenticated, anon
USING (false)
WITH CHECK (false);

-- Allow service role full access for authentication flows
CREATE POLICY "Service role can manage login tokens"
ON public.login_tokens
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');
