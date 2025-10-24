-- ============================================================================
-- Migration Rollback: 0005_security_hardening
-- Purpose: Safely rollback security hardening changes
-- Author: AI Security Engineer
-- Date: 2025-10-24
-- ============================================================================

-- WARNING: This rollback removes security improvements. 
-- Only use if absolutely necessary and with admin approval.

BEGIN;

-- =============================================================================
-- REMOVE TRIGGERS
-- =============================================================================

DROP TRIGGER IF EXISTS check_self_referral ON public.referrals;
DROP FUNCTION IF EXISTS public.prevent_self_referral();

RAISE NOTICE 'Removed self-referral trigger';

-- =============================================================================
-- REMOVE CLEANUP FUNCTIONS
-- =============================================================================

DROP FUNCTION IF EXISTS public.cleanup_old_checkout_sessions();
DROP FUNCTION IF EXISTS public.cleanup_old_stripe_events();

RAISE NOTICE 'Removed cleanup functions';

-- =============================================================================
-- REMOVE INDEXES
-- =============================================================================

DROP INDEX IF EXISTS public.idx_stripe_events_event_id;
DROP INDEX IF EXISTS public.idx_stripe_events_created_at;
DROP INDEX IF EXISTS public.idx_subscriptions_stripe_customer;
DROP INDEX IF EXISTS public.idx_subscriptions_stripe_subscription;
DROP INDEX IF EXISTS public.idx_subscriptions_status;
DROP INDEX IF EXISTS public.idx_referrals_code;
DROP INDEX IF EXISTS public.idx_referrals_referrer_status;
DROP INDEX IF EXISTS public.idx_user_weekly_menus_lookup;
DROP INDEX IF EXISTS public.idx_processed_checkout_session_id;
DROP INDEX IF EXISTS public.idx_processed_checkout_created_at;
DROP INDEX IF EXISTS public.idx_processed_checkout_payment_status;

RAISE NOTICE 'Removed performance indexes';

-- =============================================================================
-- REMOVE CONSTRAINTS
-- =============================================================================

ALTER TABLE public.referrals DROP CONSTRAINT IF EXISTS unique_referrer_code;
ALTER TABLE public.referrals DROP CONSTRAINT IF EXISTS fk_referrals_referred;
ALTER TABLE public.referrals DROP CONSTRAINT IF EXISTS fk_referrals_referrer;
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS fk_subscriptions_user;

RAISE NOTICE 'Removed foreign key constraints';

-- =============================================================================
-- REMOVE TABLES
-- =============================================================================

-- Drop stripe_events table (WARNING: This deletes idempotency data)
DROP TABLE IF EXISTS public.stripe_events CASCADE;

RAISE NOTICE 'Removed stripe_events table';

-- =============================================================================
-- VERIFICATION
-- =============================================================================

RAISE NOTICE '========================================';
RAISE NOTICE 'Rollback of migration 0005_security_hardening completed';
RAISE NOTICE 'WARNING: Security improvements have been removed';
RAISE NOTICE '========================================';

COMMIT;
