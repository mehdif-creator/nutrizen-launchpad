-- pgTAP smoke tests for NutriZen critical schema
-- Run with: supabase test db

BEGIN;

-- Load pgTAP
CREATE EXTENSION IF NOT EXISTS pgtap;

-- Plan: declare the number of tests
SELECT plan(16);

-- ════════════════════════════════════════════════
-- 1. Critical tables exist
-- ════════════════════════════════════════════════

SELECT has_table('public', 'profiles',              'profiles table exists');
SELECT has_table('public', 'preferences',           'preferences table exists');
SELECT has_table('public', 'recipes',               'recipes table exists');
SELECT has_table('public', 'credit_transactions',   'credit_transactions table exists');
SELECT has_table('public', 'user_roles',            'user_roles table exists');
SELECT has_table('public', 'payment_events_log',    'payment_events_log table exists');
SELECT has_table('public', 'gamification_events',   'gamification_events table exists');
SELECT has_table('public', 'feature_flags',         'feature_flags table exists');

-- ════════════════════════════════════════════════
-- 2. Critical columns exist
-- ════════════════════════════════════════════════

SELECT has_column('public', 'profiles', 'stripe_customer_id',
  'profiles has stripe_customer_id column');

SELECT has_column('public', 'profiles', 'email',
  'profiles has email column');

SELECT has_column('public', 'credit_transactions', 'idempotency_key',
  'credit_transactions has idempotency_key for dedup');

SELECT has_column('public', 'credit_transactions', 'user_id',
  'credit_transactions has user_id');

-- ════════════════════════════════════════════════
-- 3. RLS is enabled on sensitive tables
-- ════════════════════════════════════════════════

SELECT has_table('public', 'credit_transactions', 'credit_transactions exists for RLS check');

-- Check RLS is enabled (via pg_class)
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'profiles' AND relnamespace = 'public'::regnamespace),
  'RLS is enabled on profiles'
);

SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'credit_transactions' AND relnamespace = 'public'::regnamespace),
  'RLS is enabled on credit_transactions'
);

SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'preferences' AND relnamespace = 'public'::regnamespace),
  'RLS is enabled on preferences'
);

-- ════════════════════════════════════════════════
-- Done
-- ════════════════════════════════════════════════

SELECT * FROM finish();

ROLLBACK;
