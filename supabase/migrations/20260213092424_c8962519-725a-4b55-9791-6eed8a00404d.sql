-- Add stripe_customer_id column to profiles for direct lookup (avoids listUsers)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id text;

-- Unique partial index for fast O(log n) lookup
CREATE UNIQUE INDEX IF NOT EXISTS profiles_stripe_customer_id_uidx
  ON public.profiles (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- Index on subscriptions.stripe_customer_id for webhook lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_cust
  ON public.subscriptions (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;