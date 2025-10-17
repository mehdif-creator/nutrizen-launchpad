-- Create referrals table for tracking referral system
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  referral_code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rewarded')),
  reward_points integer DEFAULT 5,
  created_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  UNIQUE(referrer_id, referred_id)
);

-- Enable RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Users can view their own referrals (as referrer)
CREATE POLICY "Users can view referrals they made"
ON public.referrals
FOR SELECT
USING (auth.uid() = referrer_id);

-- Users can insert referrals (system will validate)
CREATE POLICY "Users can create referrals"
ON public.referrals
FOR INSERT
WITH CHECK (auth.uid() = referrer_id);

-- Admins can manage all referrals
CREATE POLICY "Admins can manage all referrals"
ON public.referrals
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster lookups
CREATE INDEX idx_referrals_code ON public.referrals(referral_code);
CREATE INDEX idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX idx_referrals_status ON public.referrals(status);

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code(user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code text;
  profile_data record;
BEGIN
  -- Get user profile
  SELECT * INTO profile_data FROM profiles WHERE id = user_id;
  
  -- Generate code from name or email
  IF profile_data.full_name IS NOT NULL AND profile_data.full_name != '' THEN
    code := lower(regexp_replace(profile_data.full_name, '[^a-zA-Z0-9]', '', 'g'));
  ELSE
    code := lower(split_part(profile_data.email, '@', 1));
  END IF;
  
  -- Add random suffix to ensure uniqueness
  code := code || substring(md5(random()::text) from 1 for 4);
  
  -- Ensure uniqueness
  WHILE EXISTS (SELECT 1 FROM referrals WHERE referral_code = code) LOOP
    code := code || substring(md5(random()::text) from 1 for 2);
  END LOOP;
  
  RETURN code;
END;
$$;

-- Create referral code for existing users
INSERT INTO public.referrals (referrer_id, referral_code)
SELECT 
  p.id,
  public.generate_referral_code(p.id)
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.referrals r WHERE r.referrer_id = p.id
)
ON CONFLICT (referrer_id, referred_id) DO NOTHING;

-- Trigger to create referral code when user signs up
CREATE OR REPLACE FUNCTION public.create_referral_code_for_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.referrals (referrer_id, referral_code)
  VALUES (NEW.id, public.generate_referral_code(NEW.id))
  ON CONFLICT (referral_code) DO NOTHING;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created_create_referral
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.create_referral_code_for_new_user();