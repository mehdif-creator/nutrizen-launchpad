-- Add household size fields to user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS household_adults integer NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS household_children integer NOT NULL DEFAULT 0;

-- Add comment for clarity
COMMENT ON COLUMN user_profiles.household_adults IS 'Number of adults in household';
COMMENT ON COLUMN user_profiles.household_children IS 'Number of children in household (count as 0.7 portion each)';

-- Add portion factor fields to user_weekly_menu_items
ALTER TABLE user_weekly_menu_items
ADD COLUMN IF NOT EXISTS portion_factor numeric NOT NULL DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS target_servings numeric NOT NULL DEFAULT 1.0;

COMMENT ON COLUMN user_weekly_menu_items.portion_factor IS 'Multiplier based on household size vs recipe base servings';
COMMENT ON COLUMN user_weekly_menu_items.target_servings IS 'Effective number of servings for this household';

-- Create or replace helper function to calculate effective household size
CREATE OR REPLACE FUNCTION calculate_effective_household_size(p_adults integer, p_children integer)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT (COALESCE(p_adults, 1) + COALESCE(p_children, 0) * 0.7)::numeric;
$$;

-- Create function to get user's household info
CREATE OR REPLACE FUNCTION get_user_household_info(p_user_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'adults', COALESCE(household_adults, 1),
    'children', COALESCE(household_children, 0),
    'effective_size', calculate_effective_household_size(
      COALESCE(household_adults, 1),
      COALESCE(household_children, 0)
    )
  )
  FROM user_profiles
  WHERE id = p_user_id;
$$;