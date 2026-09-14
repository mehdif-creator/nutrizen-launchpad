CREATE TABLE IF NOT EXISTS public.store_subscriptions (
  user_id uuid PRIMARY KEY,
  provider text NOT NULL DEFAULT 'play_store',
  rc_app_user_id text,
  entitlement text,
  product_id text,
  status text NOT NULL DEFAULT 'unknown',
  expires_at timestamptz,
  will_renew boolean,
  environment text,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.store_subscriptions TO authenticated;
GRANT ALL ON public.store_subscriptions TO service_role;

ALTER TABLE public.store_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own store subscription" ON public.store_subscriptions;
CREATE POLICY "Users can read own store subscription"
ON public.store_subscriptions FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS store_subscriptions_status_idx ON public.store_subscriptions (status);