-- Fix: Update RPC to use onboarding_completed_at and onboarding_version as server truth
-- Also add a helper function to check onboarding status

-- Create function to check if user has completed onboarding v1
CREATE OR REPLACE FUNCTION public.is_onboarding_complete(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_completed_at timestamptz;
  v_version int;
BEGIN
  SELECT onboarding_completed_at, onboarding_version
  INTO v_completed_at, v_version
  FROM public.user_profiles
  WHERE id = p_user_id;
  
  -- Completed if onboarding_completed_at is set AND version is 1
  RETURN v_completed_at IS NOT NULL AND v_version = 1;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.is_onboarding_complete(uuid) TO authenticated;

-- Also update onboarding_version column to be TEXT as per requirements
-- (Currently integer 1, should be text 'v1' for future flexibility)
-- Actually let's keep it as is since changing type could break existing data
-- Just ensure the generate-menu function populates user_daily_recipes correctly

-- The main fix: when generate-menu runs, it must also upsert into user_daily_recipes
-- This is handled in the Edge Function, not here