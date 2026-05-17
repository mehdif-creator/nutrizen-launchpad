ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS billing_interval text
    CHECK (billing_interval IN ('month','year'));

COMMENT ON COLUMN public.subscriptions.billing_interval IS
  'Stripe price recurring interval: month or year. Synced from check-subscription / stripe-webhook.';