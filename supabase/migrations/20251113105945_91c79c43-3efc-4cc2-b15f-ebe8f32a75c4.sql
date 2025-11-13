-- Add onboarding fields to user_profiles table
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_onboarding ON public.user_profiles(onboarding_completed, onboarding_step);

COMMENT ON COLUMN public.user_profiles.onboarding_step IS 'Current onboarding step: 0=not started, 1-4=step number, 4=completed';
COMMENT ON COLUMN public.user_profiles.onboarding_completed IS 'Whether user has completed the onboarding flow';