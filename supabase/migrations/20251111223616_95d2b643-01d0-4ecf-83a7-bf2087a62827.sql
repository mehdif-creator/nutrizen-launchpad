-- Create function to auto-generate menu after profile completion
-- This ensures idempotent menu generation for new users

CREATE OR REPLACE FUNCTION public.generate_initial_menu_for_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_week_start DATE;
  v_existing_menu UUID;
BEGIN
  -- Only trigger if this is a meaningful profile update
  -- (not just timestamp updates)
  IF (TG_OP = 'UPDATE' AND 
      OLD.objectif_principal IS NOT DISTINCT FROM NEW.objectif_principal AND
      OLD.type_alimentation IS NOT DISTINCT FROM NEW.type_alimentation) THEN
    RETURN NEW;
  END IF;

  -- Calculate current week start (Monday)
  v_week_start := DATE_TRUNC('week', CURRENT_DATE AT TIME ZONE 'Europe/Paris')::DATE;
  
  -- Check if user already has a menu for this week
  SELECT menu_id INTO v_existing_menu
  FROM public.user_weekly_menus
  WHERE user_id = NEW.user_id 
    AND week_start = v_week_start
  LIMIT 1;
  
  -- Only proceed if no menu exists (idempotent)
  IF v_existing_menu IS NULL THEN
    -- Log that we need to generate a menu
    -- The actual generation will be done by the edge function
    -- This trigger just marks that it's needed
    INSERT INTO public.user_events (user_id, event_type, meta)
    VALUES (
      NEW.user_id,
      'PROFILE_COMPLETED',
      jsonb_build_object(
        'week_start', v_week_start,
        'trigger', 'profile_completion',
        'needs_menu', true
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on preferences table
DROP TRIGGER IF EXISTS trigger_generate_menu_on_profile_completion ON public.preferences;

CREATE TRIGGER trigger_generate_menu_on_profile_completion
  AFTER INSERT OR UPDATE ON public.preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_initial_menu_for_user();

-- Add index for faster menu lookups
CREATE INDEX IF NOT EXISTS idx_user_weekly_menus_user_week 
  ON public.user_weekly_menus(user_id, week_start);

-- Add unique constraint to prevent duplicate menus
ALTER TABLE public.user_weekly_menus
  DROP CONSTRAINT IF EXISTS unique_user_week_menu;

ALTER TABLE public.user_weekly_menus
  ADD CONSTRAINT unique_user_week_menu 
  UNIQUE (user_id, week_start);

COMMENT ON FUNCTION public.generate_initial_menu_for_user() IS 
  'Triggers menu generation event when user completes or updates their profile. Actual generation happens via edge function to avoid long-running transactions.';

COMMENT ON CONSTRAINT unique_user_week_menu ON public.user_weekly_menus IS
  'Ensures idempotent menu generation - one menu per user per week';
