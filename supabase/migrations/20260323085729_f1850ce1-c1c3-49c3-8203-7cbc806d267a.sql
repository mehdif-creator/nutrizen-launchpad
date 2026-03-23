
-- Fix: drop the CONSTRAINT (not index) for duplicate idempotency key
ALTER TABLE public.referral_events DROP CONSTRAINT IF EXISTS referral_events_idempotency_key_key;

-- The conditional unique index referral_events_idempotency_key_unique remains as the single enforcement
