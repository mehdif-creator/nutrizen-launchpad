
-- Fix: recreate user_profiles view as SECURITY INVOKER (default, not SECURITY DEFINER)
DROP VIEW IF EXISTS public.user_profiles CASCADE;

CREATE VIEW public.user_profiles
WITH (security_invoker = true)
AS
SELECT
  id,
  display_name,
  avatar_url,
  referral_code,
  show_on_leaderboard,
  created_at,
  updated_at,
  onboarding_step,
  onboarding_completed,
  household_adults,
  household_children,
  is_affiliate,
  affiliate_code,
  onboarding_status,
  onboarding_version,
  onboarding_completed_at,
  required_fields_ok,
  kid_portion_ratio,
  meals_per_day,
  default_servings_per_recipe,
  portion_strategy,
  default_servings_rounding,
  last_diagnostics_at,
  diagnostics_meta
FROM public.profiles;

-- Recreate the INSTEAD OF triggers for backward compat writes
CREATE TRIGGER user_profiles_view_trigger
  INSTEAD OF INSERT OR UPDATE OR DELETE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.user_profiles_upsert_fn();
