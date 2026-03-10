-- Table: affiliates
CREATE TABLE public.affiliates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  affiliate_code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE(user_id)
);

ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own affiliate row"
  ON public.affiliates FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own affiliate row"
  ON public.affiliates FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Table: affiliate_referrals
CREATE TABLE public.affiliate_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_code text NOT NULL REFERENCES public.affiliates(affiliate_code),
  referred_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  stripe_customer_id text,
  converted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliate_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliates can read own referrals"
  ON public.affiliate_referrals FOR SELECT
  TO authenticated
  USING (
    affiliate_code IN (
      SELECT affiliate_code FROM public.affiliates WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated can insert referrals"
  ON public.affiliate_referrals FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Table: affiliate_commissions
CREATE TABLE public.affiliate_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_code text NOT NULL,
  referred_user_id uuid NOT NULL,
  stripe_invoice_id text NOT NULL UNIQUE,
  subscription_amount_cents int NOT NULL,
  commission_amount_cents int NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Affiliates can read own commissions"
  ON public.affiliate_commissions FOR SELECT
  TO authenticated
  USING (
    affiliate_code IN (
      SELECT affiliate_code FROM public.affiliates WHERE user_id = auth.uid()
    )
  );

-- Admin RLS: allow admins to update commissions (mark as paid)
CREATE POLICY "Admins can update commissions"
  ON public.affiliate_commissions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Admin RLS: allow admins to read all affiliates
CREATE POLICY "Admins can read all affiliates"
  ON public.affiliates FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Admin RLS: allow admins to read all commissions
CREATE POLICY "Admins can read all commissions"
  ON public.affiliate_commissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Indexes
CREATE INDEX idx_affiliate_referrals_code ON public.affiliate_referrals(affiliate_code);
CREATE INDEX idx_affiliate_referrals_referred ON public.affiliate_referrals(referred_user_id);
CREATE INDEX idx_affiliate_commissions_code ON public.affiliate_commissions(affiliate_code);
CREATE INDEX idx_affiliate_commissions_status ON public.affiliate_commissions(status);