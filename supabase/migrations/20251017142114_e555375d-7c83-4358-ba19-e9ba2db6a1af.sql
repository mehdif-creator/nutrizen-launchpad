-- Add UPDATE policy for referrals table to allow users to complete referrals
-- This allows a user to claim a referral by setting themselves as the referred user

CREATE POLICY "Users can complete referrals for themselves"
  ON public.referrals
  FOR UPDATE
  USING (
    -- User can update if they are being set as the referred user
    -- or if the referral doesn't have a referred user yet
    auth.uid() = referred_id OR referred_id IS NULL
  )
  WITH CHECK (
    -- After update, the user must be the referred user
    auth.uid() = referred_id
  );
