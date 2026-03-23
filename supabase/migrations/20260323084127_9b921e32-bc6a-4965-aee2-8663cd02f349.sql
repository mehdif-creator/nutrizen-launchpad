
-- ============================================================
-- Attribution Continuity & Repair RPCs
-- ============================================================

-- 1. Add referral_events table for referral audit trail (if not exists)
CREATE TABLE IF NOT EXISTS public.referral_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid,
  referred_user_id uuid,
  referral_code text,
  event_type text NOT NULL,
  status text NOT NULL DEFAULT 'success',
  error_message text,
  source text, -- 'url_param', 'localStorage', 'checkout_metadata', 'webhook'
  metadata jsonb,
  idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add unique constraint on idempotency_key if not present
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'referral_events_idempotency_key_key') THEN
    ALTER TABLE public.referral_events ADD CONSTRAINT referral_events_idempotency_key_key UNIQUE (idempotency_key);
  END IF;
END $$;

-- 2. Ensure affiliate_events has source column
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'affiliate_events' AND column_name = 'source') THEN
    ALTER TABLE public.affiliate_events ADD COLUMN source text;
  END IF;
END $$;

-- 3. Repair affiliate attribution RPC (idempotent)
CREATE OR REPLACE FUNCTION public.repair_affiliate_attribution(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb := '{}'::jsonb;
  v_aff_code text;
  v_aff_user_id uuid;
BEGIN
  -- Check if user has an affiliate_referrals row
  SELECT affiliate_code INTO v_aff_code
  FROM affiliate_referrals
  WHERE referred_user_id = p_user_id
  LIMIT 1;

  IF v_aff_code IS NULL THEN
    v_result := v_result || jsonb_build_object('affiliate_referral', 'none_found');
    RETURN v_result;
  END IF;

  -- Verify affiliate exists
  SELECT user_id INTO v_aff_user_id
  FROM affiliates
  WHERE affiliate_code = v_aff_code AND is_active = true;

  IF v_aff_user_id IS NULL THEN
    v_result := v_result || jsonb_build_object('affiliate_referral', 'affiliate_inactive_or_missing');
    RETURN v_result;
  END IF;

  -- Self-affiliate check
  IF v_aff_user_id = p_user_id THEN
    v_result := v_result || jsonb_build_object('affiliate_referral', 'self_affiliate_blocked');
    RETURN v_result;
  END IF;

  -- Check if user has a subscription (needed for commission)
  -- If converted = false but user has active subscription, mark as converted
  UPDATE affiliate_referrals
  SET converted = true
  WHERE referred_user_id = p_user_id
    AND affiliate_code = v_aff_code
    AND converted = false
    AND EXISTS (
      SELECT 1 FROM subscriptions
      WHERE user_id = p_user_id AND status = 'active'
    );

  IF FOUND THEN
    v_result := v_result || jsonb_build_object('conversion_repaired', true);
  ELSE
    v_result := v_result || jsonb_build_object('conversion_repaired', false);
  END IF;

  v_result := v_result || jsonb_build_object(
    'affiliate_code', v_aff_code,
    'affiliate_user_id', v_aff_user_id,
    'status', 'checked'
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.repair_affiliate_attribution(uuid) TO authenticated;

-- 4. Ensure unique constraint on affiliate_commissions.stripe_invoice_id
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'affiliate_commissions_stripe_invoice_id_key') THEN
    ALTER TABLE public.affiliate_commissions ADD CONSTRAINT affiliate_commissions_stripe_invoice_id_key UNIQUE (stripe_invoice_id);
  END IF;
END $$;

-- 5. Ensure unique constraint on affiliate_referrals (referred_user_id) — one user can only be referred once
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'affiliate_referrals_referred_user_id_key') THEN
    ALTER TABLE public.affiliate_referrals ADD CONSTRAINT affiliate_referrals_referred_user_id_key UNIQUE (referred_user_id);
  END IF;
END $$;

-- 6. RLS for referral_events
ALTER TABLE public.referral_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can read own referral events' AND tablename = 'referral_events') THEN
    CREATE POLICY "Users can read own referral events"
      ON public.referral_events FOR SELECT TO authenticated
      USING (referrer_user_id = auth.uid() OR referred_user_id = auth.uid());
  END IF;
END $$;
