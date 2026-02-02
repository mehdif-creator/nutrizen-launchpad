-- =====================================================
-- SECURITY HARDENING: Fix PUBLIC DATA EXPOSURE issues
-- This migration restricts SELECT access on user tables
-- to only the data owner (auth.uid() = user_id)
-- =====================================================

-- ==================== USER PROFILES ====================

-- Drop overly permissive policies on user_profiles if they exist
DROP POLICY IF EXISTS "Public user_profiles are viewable by everyone" ON public.user_profiles;
DROP POLICY IF EXISTS "Anyone can view user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Public can view user_profiles" ON public.user_profiles;

-- Ensure user_profiles RLS is enabled and restrictive
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Recreate proper SELECT policy for user_profiles
DROP POLICY IF EXISTS "Users can view own user_profile" ON public.user_profiles;
CREATE POLICY "Users can view own user_profile" 
  ON public.user_profiles FOR SELECT 
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all user_profiles" ON public.user_profiles;
CREATE POLICY "Admins can view all user_profiles" 
  ON public.user_profiles FOR SELECT 
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ==================== SUBSCRIPTIONS ====================

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Public can view subscriptions" ON public.subscriptions;

DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
CREATE POLICY "Users can view own subscription" 
  ON public.subscriptions FOR SELECT 
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.subscriptions;
CREATE POLICY "Admins can view all subscriptions" 
  ON public.subscriptions FOR SELECT 
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Service role can manage subscriptions" ON public.subscriptions;
CREATE POLICY "Service role can manage subscriptions" 
  ON public.subscriptions FOR ALL 
  TO service_role
  USING (true);

-- ==================== USER WALLETS ====================

ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view user_wallets" ON public.user_wallets;
DROP POLICY IF EXISTS "Public can view user_wallets" ON public.user_wallets;

DROP POLICY IF EXISTS "Users can view own wallet" ON public.user_wallets;
CREATE POLICY "Users can view own wallet" 
  ON public.user_wallets FOR SELECT 
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all wallets" ON public.user_wallets;
CREATE POLICY "Admins can view all wallets" 
  ON public.user_wallets FOR SELECT 
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Service role can manage wallets" ON public.user_wallets;
CREATE POLICY "Service role can manage wallets" 
  ON public.user_wallets FOR ALL 
  TO service_role
  USING (true);

-- ==================== SUPPORT TICKETS ====================

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view support_tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Public can view support_tickets" ON public.support_tickets;

DROP POLICY IF EXISTS "Users can view own tickets" ON public.support_tickets;
CREATE POLICY "Users can view own tickets" 
  ON public.support_tickets FOR SELECT 
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own tickets" ON public.support_tickets;
CREATE POLICY "Users can insert own tickets" 
  ON public.support_tickets FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all tickets" ON public.support_tickets;
CREATE POLICY "Admins can manage all tickets" 
  ON public.support_tickets FOR ALL 
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ==================== USER GAMIFICATION DATA ====================

ALTER TABLE public.user_gamification ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view user_gamification" ON public.user_gamification;
DROP POLICY IF EXISTS "Public can view user_gamification" ON public.user_gamification;

DROP POLICY IF EXISTS "Users can view own gamification" ON public.user_gamification;
CREATE POLICY "Users can view own gamification" 
  ON public.user_gamification FOR SELECT 
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage gamification" ON public.user_gamification;
CREATE POLICY "Service role can manage gamification" 
  ON public.user_gamification FOR ALL 
  TO service_role
  USING (true);

-- ==================== USER POINTS ====================

ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view user_points" ON public.user_points;
DROP POLICY IF EXISTS "Public can view user_points" ON public.user_points;

DROP POLICY IF EXISTS "Users can view own points" ON public.user_points;
CREATE POLICY "Users can view own points" 
  ON public.user_points FOR SELECT 
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own points" ON public.user_points;
CREATE POLICY "Users can manage own points" 
  ON public.user_points FOR ALL 
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage points" ON public.user_points;
CREATE POLICY "Service role can manage points" 
  ON public.user_points FOR ALL 
  TO service_role
  USING (true);

-- ==================== USER DASHBOARD STATS ====================

ALTER TABLE public.user_dashboard_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view user_dashboard_stats" ON public.user_dashboard_stats;
DROP POLICY IF EXISTS "Public can view user_dashboard_stats" ON public.user_dashboard_stats;

DROP POLICY IF EXISTS "Users can view own dashboard stats" ON public.user_dashboard_stats;
CREATE POLICY "Users can view own dashboard stats" 
  ON public.user_dashboard_stats FOR SELECT 
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own dashboard stats" ON public.user_dashboard_stats;
CREATE POLICY "Users can manage own dashboard stats" 
  ON public.user_dashboard_stats FOR ALL 
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage dashboard stats" ON public.user_dashboard_stats;
CREATE POLICY "Service role can manage dashboard stats" 
  ON public.user_dashboard_stats FOR ALL 
  TO service_role
  USING (true);

-- ==================== USER STREAKS ====================

ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view user_streaks" ON public.user_streaks;
DROP POLICY IF EXISTS "Public can view user_streaks" ON public.user_streaks;

DROP POLICY IF EXISTS "Users can view own streaks" ON public.user_streaks;
CREATE POLICY "Users can view own streaks" 
  ON public.user_streaks FOR SELECT 
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage streaks" ON public.user_streaks;
CREATE POLICY "Service role can manage streaks" 
  ON public.user_streaks FOR ALL 
  TO service_role
  USING (true);

-- ==================== USER EVENTS ====================

ALTER TABLE public.user_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view user_events" ON public.user_events;
DROP POLICY IF EXISTS "Public can view user_events" ON public.user_events;

DROP POLICY IF EXISTS "Users can view own events" ON public.user_events;
CREATE POLICY "Users can view own events" 
  ON public.user_events FOR SELECT 
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage events" ON public.user_events;
CREATE POLICY "Service role can manage events" 
  ON public.user_events FOR ALL 
  TO service_role
  USING (true);

-- ==================== USER BADGES ====================

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view user_badges" ON public.user_badges;
DROP POLICY IF EXISTS "Public can view user_badges" ON public.user_badges;

DROP POLICY IF EXISTS "Users can view own badges" ON public.user_badges;
CREATE POLICY "Users can view own badges" 
  ON public.user_badges FOR SELECT 
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage badges" ON public.user_badges;
CREATE POLICY "Service role can manage badges" 
  ON public.user_badges FOR ALL 
  TO service_role
  USING (true);

-- ==================== USER CHALLENGE COMPLETIONS ====================

ALTER TABLE public.user_challenge_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view user_challenge_completions" ON public.user_challenge_completions;
DROP POLICY IF EXISTS "Public can view user_challenge_completions" ON public.user_challenge_completions;

DROP POLICY IF EXISTS "Users can view own challenge completions" ON public.user_challenge_completions;
CREATE POLICY "Users can view own challenge completions" 
  ON public.user_challenge_completions FOR SELECT 
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage challenge completions" ON public.user_challenge_completions;
CREATE POLICY "Service role can manage challenge completions" 
  ON public.user_challenge_completions FOR ALL 
  TO service_role
  USING (true);

-- ==================== USER CREDIT LOTS ====================

ALTER TABLE public.user_credit_lots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view user_credit_lots" ON public.user_credit_lots;
DROP POLICY IF EXISTS "Public can view user_credit_lots" ON public.user_credit_lots;

DROP POLICY IF EXISTS "Users can view own credit lots" ON public.user_credit_lots;
CREATE POLICY "Users can view own credit lots" 
  ON public.user_credit_lots FOR SELECT 
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage credit lots" ON public.user_credit_lots;
CREATE POLICY "Service role can manage credit lots" 
  ON public.user_credit_lots FOR ALL 
  TO service_role
  USING (true);

-- ==================== REFERRAL TABLES ====================

-- user_referrals
ALTER TABLE public.user_referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view user_referrals" ON public.user_referrals;
DROP POLICY IF EXISTS "Public can view user_referrals" ON public.user_referrals;

DROP POLICY IF EXISTS "Users can view referrals they made" ON public.user_referrals;
CREATE POLICY "Users can view referrals they made" 
  ON public.user_referrals FOR SELECT 
  TO authenticated
  USING (auth.uid() = referrer_id);

DROP POLICY IF EXISTS "Service role can manage referrals" ON public.user_referrals;
CREATE POLICY "Service role can manage referrals" 
  ON public.user_referrals FOR ALL 
  TO service_role
  USING (true);

-- referrals table
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view referrals" ON public.referrals;
DROP POLICY IF EXISTS "Public can view referrals" ON public.referrals;

DROP POLICY IF EXISTS "Users can view own referrals" ON public.referrals;
CREATE POLICY "Users can view own referrals" 
  ON public.referrals FOR SELECT 
  TO authenticated
  USING (auth.uid() = referrer_id);

DROP POLICY IF EXISTS "Admins can view all referrals" ON public.referrals;
CREATE POLICY "Admins can view all referrals" 
  ON public.referrals FOR SELECT 
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Service role can manage referrals table" ON public.referrals;
CREATE POLICY "Service role can manage referrals table" 
  ON public.referrals FOR ALL 
  TO service_role
  USING (true);

-- referral_codes
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view referral_codes" ON public.referral_codes;
DROP POLICY IF EXISTS "Public can view referral_codes" ON public.referral_codes;

DROP POLICY IF EXISTS "Users can view own referral codes" ON public.referral_codes;
CREATE POLICY "Users can view own referral codes" 
  ON public.referral_codes FOR SELECT 
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage referral codes" ON public.referral_codes;
CREATE POLICY "Service role can manage referral codes" 
  ON public.referral_codes FOR ALL 
  TO service_role
  USING (true);

-- referral_clicks
ALTER TABLE public.referral_clicks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view referral_clicks" ON public.referral_clicks;
DROP POLICY IF EXISTS "Public can view referral_clicks" ON public.referral_clicks;

DROP POLICY IF EXISTS "Users can view clicks on their referral codes" ON public.referral_clicks;
CREATE POLICY "Users can view clicks on their referral codes" 
  ON public.referral_clicks FOR SELECT 
  TO authenticated
  USING (auth.uid() = referrer_user_id);

DROP POLICY IF EXISTS "Admins can view all referral clicks" ON public.referral_clicks;
CREATE POLICY "Admins can view all referral clicks" 
  ON public.referral_clicks FOR SELECT 
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Service role can manage referral clicks" ON public.referral_clicks;
CREATE POLICY "Service role can manage referral clicks" 
  ON public.referral_clicks FOR ALL 
  TO service_role
  USING (true);

-- referral_events
ALTER TABLE public.referral_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view referral_events" ON public.referral_events;
DROP POLICY IF EXISTS "Public can view referral_events" ON public.referral_events;

DROP POLICY IF EXISTS "Users can view own referral events" ON public.referral_events;
CREATE POLICY "Users can view own referral events" 
  ON public.referral_events FOR SELECT 
  TO authenticated
  USING (auth.uid() = referrer_user_id);

DROP POLICY IF EXISTS "Admins can view all referral events" ON public.referral_events;
CREATE POLICY "Admins can view all referral events" 
  ON public.referral_events FOR SELECT 
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Service role can manage referral events" ON public.referral_events;
CREATE POLICY "Service role can manage referral events" 
  ON public.referral_events FOR ALL 
  TO service_role
  USING (true);

-- referral_attributions
ALTER TABLE public.referral_attributions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view referral_attributions" ON public.referral_attributions;
DROP POLICY IF EXISTS "Public can view referral_attributions" ON public.referral_attributions;

DROP POLICY IF EXISTS "Users can view own attributions" ON public.referral_attributions;
CREATE POLICY "Users can view own attributions" 
  ON public.referral_attributions FOR SELECT 
  TO authenticated
  USING (auth.uid() = referrer_user_id);

DROP POLICY IF EXISTS "Service role can manage attributions" ON public.referral_attributions;
CREATE POLICY "Service role can manage attributions" 
  ON public.referral_attributions FOR ALL 
  TO service_role
  USING (true);

-- ==================== MEAL & MENU DATA ====================

-- user_daily_recipes
ALTER TABLE public.user_daily_recipes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view user_daily_recipes" ON public.user_daily_recipes;
DROP POLICY IF EXISTS "Public can view user_daily_recipes" ON public.user_daily_recipes;

DROP POLICY IF EXISTS "Users can view own daily recipes" ON public.user_daily_recipes;
CREATE POLICY "Users can view own daily recipes" 
  ON public.user_daily_recipes FOR SELECT 
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own daily recipes" ON public.user_daily_recipes;
CREATE POLICY "Users can manage own daily recipes" 
  ON public.user_daily_recipes FOR ALL 
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage daily recipes" ON public.user_daily_recipes;
CREATE POLICY "Service role can manage daily recipes" 
  ON public.user_daily_recipes FOR ALL 
  TO service_role
  USING (true);

-- user_weekly_menus
ALTER TABLE public.user_weekly_menus ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view user_weekly_menus" ON public.user_weekly_menus;
DROP POLICY IF EXISTS "Public can view user_weekly_menus" ON public.user_weekly_menus;

DROP POLICY IF EXISTS "Users can view own weekly menus" ON public.user_weekly_menus;
CREATE POLICY "Users can view own weekly menus" 
  ON public.user_weekly_menus FOR SELECT 
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own weekly menus" ON public.user_weekly_menus;
CREATE POLICY "Users can manage own weekly menus" 
  ON public.user_weekly_menus FOR ALL 
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage weekly menus" ON public.user_weekly_menus;
CREATE POLICY "Service role can manage weekly menus" 
  ON public.user_weekly_menus FOR ALL 
  TO service_role
  USING (true);

-- user_weekly_menu_items - need to join to parent table using weekly_menu_id
ALTER TABLE public.user_weekly_menu_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view user_weekly_menu_items" ON public.user_weekly_menu_items;
DROP POLICY IF EXISTS "Public can view user_weekly_menu_items" ON public.user_weekly_menu_items;

DROP POLICY IF EXISTS "Users can view own menu items" ON public.user_weekly_menu_items;
CREATE POLICY "Users can view own menu items" 
  ON public.user_weekly_menu_items FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_weekly_menus m 
      WHERE m.id = user_weekly_menu_items.weekly_menu_id 
      AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage own menu items" ON public.user_weekly_menu_items;
CREATE POLICY "Users can manage own menu items" 
  ON public.user_weekly_menu_items FOR ALL 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_weekly_menus m 
      WHERE m.id = user_weekly_menu_items.weekly_menu_id 
      AND m.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_weekly_menus m 
      WHERE m.id = user_weekly_menu_items.weekly_menu_id 
      AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role can manage menu items" ON public.user_weekly_menu_items;
CREATE POLICY "Service role can manage menu items" 
  ON public.user_weekly_menu_items FOR ALL 
  TO service_role
  USING (true);

-- ==================== SWAPS ====================

ALTER TABLE public.swaps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view swaps" ON public.swaps;
DROP POLICY IF EXISTS "Public can view swaps" ON public.swaps;

DROP POLICY IF EXISTS "Users can view own swaps" ON public.swaps;
CREATE POLICY "Users can view own swaps" 
  ON public.swaps FOR SELECT 
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own swaps" ON public.swaps;
CREATE POLICY "Users can manage own swaps" 
  ON public.swaps FOR ALL 
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all swaps" ON public.swaps;
CREATE POLICY "Admins can view all swaps" 
  ON public.swaps FOR SELECT 
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ==================== GAMIFICATION EVENTS ====================

ALTER TABLE public.gamification_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view gamification_events" ON public.gamification_events;
DROP POLICY IF EXISTS "Public can view gamification_events" ON public.gamification_events;

DROP POLICY IF EXISTS "Users can view own gamification events" ON public.gamification_events;
CREATE POLICY "Users can view own gamification events" 
  ON public.gamification_events FOR SELECT 
  TO authenticated
  USING (auth.uid() = user_id);

-- ==================== USER ROLES ====================

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Public can view user_roles" ON public.user_roles;

DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" 
  ON public.user_roles FOR SELECT 
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles" 
  ON public.user_roles FOR SELECT 
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Service role can manage roles" ON public.user_roles;
CREATE POLICY "Service role can manage roles" 
  ON public.user_roles FOR ALL 
  TO service_role
  USING (true);

-- ==================== USER DAILY ADVICE SEEN ====================

ALTER TABLE public.user_daily_advice_seen ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view user_daily_advice_seen" ON public.user_daily_advice_seen;
DROP POLICY IF EXISTS "Public can view user_daily_advice_seen" ON public.user_daily_advice_seen;

DROP POLICY IF EXISTS "Users can view own advice seen" ON public.user_daily_advice_seen;
CREATE POLICY "Users can view own advice seen" 
  ON public.user_daily_advice_seen FOR SELECT 
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own advice seen" ON public.user_daily_advice_seen;
CREATE POLICY "Users can manage own advice seen" 
  ON public.user_daily_advice_seen FOR ALL 
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ==================== Add user SELECT policy to payment_events_log ====================

DROP POLICY IF EXISTS "Users can view own payment logs" ON public.payment_events_log;
CREATE POLICY "Users can view own payment logs" 
  ON public.payment_events_log FOR SELECT 
  TO authenticated
  USING (auth.uid() = user_id);

-- ==================== Add user SELECT policy to processed_checkout_sessions ====================

DROP POLICY IF EXISTS "Users can view own checkout sessions" ON public.processed_checkout_sessions;
CREATE POLICY "Users can view own checkout sessions" 
  ON public.processed_checkout_sessions FOR SELECT 
  TO authenticated
  USING (auth.uid() = user_id);