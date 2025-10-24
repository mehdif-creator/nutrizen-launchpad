-- ============================================================================
-- Migration: 0005_security_hardening
-- Purpose: Add security constraints, idempotency, indexes, and cleanup
-- Author: AI Security Engineer
-- Date: 2025-10-24
-- ============================================================================

-- =============================================================================
-- STRIPE WEBHOOK IDEMPOTENCY
-- =============================================================================

-- Table to track processed Stripe events (prevent duplicate processing)
CREATE TABLE IF NOT EXISTS public.stripe_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text UNIQUE NOT NULL,
  event_type text NOT NULL,
  processed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;

-- Only service role can manage stripe events
CREATE POLICY "Service role can manage stripe events"
  ON public.stripe_events
  FOR ALL
  USING (auth.role() = 'service_role'::text);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_stripe_events_event_id 
  ON public.stripe_events(event_id);

-- Index for cleanup
CREATE INDEX IF NOT EXISTS idx_stripe_events_created_at 
  ON public.stripe_events(created_at);

COMMENT ON TABLE public.stripe_events IS 'Tracks processed Stripe webhook events for idempotency';

-- =============================================================================
-- FOREIGN KEY CONSTRAINTS
-- =============================================================================

-- Add FK constraints to enforce referential integrity
-- Note: Using CASCADE to ensure cleanup when users are deleted

-- Subscriptions -> Auth Users
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_subscriptions_user'
  ) THEN
    ALTER TABLE public.subscriptions
      ADD CONSTRAINT fk_subscriptions_user
      FOREIGN KEY (user_id)
      REFERENCES auth.users(id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- Referrals -> Auth Users (referrer)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_referrals_referrer'
  ) THEN
    ALTER TABLE public.referrals
      ADD CONSTRAINT fk_referrals_referrer
      FOREIGN KEY (referrer_id)
      REFERENCES auth.users(id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- Referrals -> Auth Users (referred)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_referrals_referred'
  ) THEN
    ALTER TABLE public.referrals
      ADD CONSTRAINT fk_referrals_referred
      FOREIGN KEY (referred_id)
      REFERENCES auth.users(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- =============================================================================
-- PERFORMANCE INDEXES
-- =============================================================================

-- Subscriptions: Fast lookup by Stripe customer ID (used in webhooks)
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer
  ON public.subscriptions(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- Subscriptions: Fast lookup by Stripe subscription ID
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription
  ON public.subscriptions(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

-- Subscriptions: Fast lookup by status (for active subscription checks)
CREATE INDEX IF NOT EXISTS idx_subscriptions_status
  ON public.subscriptions(user_id, status);

-- Referrals: Fast lookup by referral code (used in referral validation)
CREATE INDEX IF NOT EXISTS idx_referrals_code
  ON public.referrals(referral_code)
  WHERE referred_id IS NULL; -- Only index unclaimed codes

-- Referrals: Fast lookup by referrer (for user's referral stats)
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_status
  ON public.referrals(referrer_id, status);

-- User weekly menus: Fast lookup by user and week
CREATE INDEX IF NOT EXISTS idx_user_weekly_menus_lookup
  ON public.user_weekly_menus(user_id, week_start);

-- Processed checkout sessions: Fast session_id lookup
CREATE INDEX IF NOT EXISTS idx_processed_checkout_session_id
  ON public.processed_checkout_sessions(session_id);

-- Processed checkout sessions: Index for cleanup
CREATE INDEX IF NOT EXISTS idx_processed_checkout_created_at
  ON public.processed_checkout_sessions(created_at);

-- =============================================================================
-- CHECKOUT SESSION IMPROVEMENTS
-- =============================================================================

-- Add index on payment_status for better query performance
CREATE INDEX IF NOT EXISTS idx_processed_checkout_payment_status
  ON public.processed_checkout_sessions(payment_status);

-- =============================================================================
-- CLEANUP FUNCTIONS
-- =============================================================================

-- Function to cleanup old processed checkout sessions (30 days retention)
CREATE OR REPLACE FUNCTION public.cleanup_old_checkout_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.processed_checkout_sessions
  WHERE created_at < now() - interval '30 days';
  
  RAISE NOTICE 'Cleaned up old checkout sessions older than 30 days';
END;
$$;

COMMENT ON FUNCTION public.cleanup_old_checkout_sessions() IS 
  'Removes processed checkout sessions older than 30 days to prevent table bloat';

-- Function to cleanup old stripe events (90 days retention)
CREATE OR REPLACE FUNCTION public.cleanup_old_stripe_events()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.stripe_events
  WHERE created_at < now() - interval '90 days';
  
  RAISE NOTICE 'Cleaned up old stripe events older than 90 days';
END;
$$;

COMMENT ON FUNCTION public.cleanup_old_stripe_events() IS 
  'Removes processed stripe events older than 90 days for audit purposes';

-- =============================================================================
-- REFERRAL IMPROVEMENTS
-- =============================================================================

-- Ensure referral codes are unique per user
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'unique_referrer_code'
  ) THEN
    ALTER TABLE public.referrals
      ADD CONSTRAINT unique_referrer_code
      UNIQUE (referrer_id, referral_code);
  END IF;
END $$;

-- Prevent self-referral at database level
CREATE OR REPLACE FUNCTION public.prevent_self_referral()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.referred_id = NEW.referrer_id THEN
    RAISE EXCEPTION 'Users cannot refer themselves';
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'check_self_referral'
  ) THEN
    CREATE TRIGGER check_self_referral
      BEFORE INSERT OR UPDATE ON public.referrals
      FOR EACH ROW
      EXECUTE FUNCTION public.prevent_self_referral();
  END IF;
END $$;

-- =============================================================================
-- ANALYZE TABLES
-- =============================================================================

-- Update statistics for query planner
ANALYZE public.subscriptions;
ANALYZE public.referrals;
ANALYZE public.user_weekly_menus;
ANALYZE public.processed_checkout_sessions;
ANALYZE public.stripe_events;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Verify stripe_events table
DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'stripe_events';
  
  IF v_count = 0 THEN
    RAISE EXCEPTION 'stripe_events table not created';
  END IF;
  
  RAISE NOTICE '✅ stripe_events table created successfully';
END $$;

-- Verify indexes
DO $$
DECLARE
  v_missing_indexes text[];
  v_expected_indexes text[] := ARRAY[
    'idx_stripe_events_event_id',
    'idx_subscriptions_stripe_customer',
    'idx_referrals_code',
    'idx_user_weekly_menus_lookup',
    'idx_processed_checkout_session_id'
  ];
  v_idx text;
BEGIN
  v_missing_indexes := ARRAY[]::text[];
  
  FOREACH v_idx IN ARRAY v_expected_indexes LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE schemaname = 'public' AND indexname = v_idx
    ) THEN
      v_missing_indexes := array_append(v_missing_indexes, v_idx);
    END IF;
  END LOOP;
  
  IF array_length(v_missing_indexes, 1) > 0 THEN
    RAISE WARNING 'Missing indexes: %', array_to_string(v_missing_indexes, ', ');
  ELSE
    RAISE NOTICE '✅ All performance indexes created successfully';
  END IF;
END $$;

-- Verify foreign keys
DO $$
DECLARE
  v_missing_fks text[];
  v_expected_fks text[] := ARRAY[
    'fk_subscriptions_user',
    'fk_referrals_referrer',
    'fk_referrals_referred'
  ];
  v_fk text;
BEGIN
  v_missing_fks := ARRAY[]::text[];
  
  FOREACH v_fk IN ARRAY v_expected_fks LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = v_fk
    ) THEN
      v_missing_fks := array_append(v_missing_fks, v_fk);
    END IF;
  END LOOP;
  
  IF array_length(v_missing_fks, 1) > 0 THEN
    RAISE WARNING 'Missing foreign keys: %', array_to_string(v_missing_fks, ', ');
  ELSE
    RAISE NOTICE '✅ All foreign key constraints created successfully';
  END IF;
END $$;

RAISE NOTICE '========================================';
RAISE NOTICE 'Migration 0005_security_hardening completed successfully';
RAISE NOTICE '========================================';
