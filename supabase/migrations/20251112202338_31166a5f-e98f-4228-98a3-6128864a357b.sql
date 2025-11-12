-- ============================================
-- REFERRAL SYSTEM COMPLETE SETUP
-- ============================================

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_code text;
  code_exists boolean;
BEGIN
  LOOP
    -- Generate 10 character alphanumeric code
    new_code := lower(substring(md5(random()::text || clock_timestamp()::text) from 1 for 10));
    
    -- Check if code exists in user_profiles
    SELECT EXISTS(
      SELECT 1 FROM public.user_profiles WHERE referral_code = new_code
    ) INTO code_exists;
    
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$;

-- Trigger function to auto-generate referral code
CREATE OR REPLACE FUNCTION public.auto_generate_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := public.generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on user_profiles
DROP TRIGGER IF EXISTS trigger_auto_generate_referral_code ON public.user_profiles;
CREATE TRIGGER trigger_auto_generate_referral_code
  BEFORE INSERT ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_referral_code();

-- Backfill existing users without referral codes
UPDATE public.user_profiles
SET referral_code = public.generate_referral_code()
WHERE referral_code IS NULL;

-- Make referral_code NOT NULL now that all users have one
ALTER TABLE public.user_profiles
ALTER COLUMN referral_code SET NOT NULL;

-- Add unique constraint on referral_code
ALTER TABLE public.user_profiles
ADD CONSTRAINT user_profiles_referral_code_unique UNIQUE (referral_code);

-- ============================================
-- REFERRAL TRACKING AND REWARDS
-- ============================================

-- Function to handle referral signup
CREATE OR REPLACE FUNCTION public.handle_referral_signup(
  p_referral_code text,
  p_new_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_referrer_id uuid;
  v_referral_exists boolean;
  v_result jsonb;
BEGIN
  -- Find referrer by code
  SELECT id INTO v_referrer_id
  FROM public.user_profiles
  WHERE referral_code = p_referral_code;
  
  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Code de parrainage invalide'
    );
  END IF;
  
  -- Check if user already signed up with a referral
  SELECT EXISTS(
    SELECT 1 FROM public.user_referrals
    WHERE referred_user_id = p_new_user_id
  ) INTO v_referral_exists;
  
  IF v_referral_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Vous avez déjà utilisé un code de parrainage'
    );
  END IF;
  
  -- Create referral record
  INSERT INTO public.user_referrals (
    referrer_id,
    referred_user_id,
    status
  ) VALUES (
    v_referrer_id,
    p_new_user_id,
    'SIGNED_UP'
  );
  
  -- Award points to referrer (10 credits as per widget)
  INSERT INTO public.user_events (
    user_id,
    event_type,
    points_delta,
    credits_delta,
    meta
  ) VALUES (
    v_referrer_id,
    'REFERRAL_COMPLETED',
    0,
    10,
    jsonb_build_object(
      'referred_user_id', p_new_user_id,
      'referral_code', p_referral_code
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Parrainage enregistré avec succès',
    'referrer_id', v_referrer_id
  );
END;
$$;

-- Function to get active referrals count
CREATE OR REPLACE FUNCTION public.get_active_referrals_count(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COUNT(*)::integer
  FROM public.user_referrals
  WHERE referrer_id = p_user_id
    AND status = 'SIGNED_UP'
    AND referred_user_id IS NOT NULL;
$$;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_user_referrals_referrer 
  ON public.user_referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_user_referrals_referred 
  ON public.user_referrals(referred_user_id);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_referral_signup TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_referrals_count TO authenticated;