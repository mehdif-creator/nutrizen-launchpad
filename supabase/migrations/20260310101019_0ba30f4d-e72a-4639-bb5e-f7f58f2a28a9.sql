-- Fix overly permissive INSERT policy on affiliate_referrals
DROP POLICY "Authenticated can insert referrals" ON public.affiliate_referrals;

CREATE POLICY "Authenticated can insert own referrals"
  ON public.affiliate_referrals FOR INSERT
  TO authenticated
  WITH CHECK (referred_user_id = auth.uid());