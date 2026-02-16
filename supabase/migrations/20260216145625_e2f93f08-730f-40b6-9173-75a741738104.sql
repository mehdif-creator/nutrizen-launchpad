
-- ============================================================
-- Phase 1: Consolidate user_profiles into profiles (canonical)
-- ============================================================

-- 1) Add all user_profiles-only columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS referral_code text,
  ADD COLUMN IF NOT EXISTS show_on_leaderboard boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS onboarding_step integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS household_adults integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS household_children integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_affiliate boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS affiliate_code text,
  ADD COLUMN IF NOT EXISTS onboarding_status text NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS onboarding_version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS required_fields_ok boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS kid_portion_ratio numeric NOT NULL DEFAULT 0.6,
  ADD COLUMN IF NOT EXISTS meals_per_day integer NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS default_servings_per_recipe integer NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS portion_strategy text NOT NULL DEFAULT 'household',
  ADD COLUMN IF NOT EXISTS default_servings_rounding text NOT NULL DEFAULT 'nearest_1';

-- 2) Backfill from user_profiles into profiles
UPDATE public.profiles p
SET
  display_name = COALESCE(p.display_name, up.display_name),
  referral_code = COALESCE(p.referral_code, up.referral_code),
  show_on_leaderboard = up.show_on_leaderboard,
  onboarding_step = COALESCE(up.onboarding_step, 0),
  onboarding_completed = COALESCE(up.onboarding_completed, false),
  household_adults = up.household_adults,
  household_children = up.household_children,
  is_affiliate = up.is_affiliate,
  affiliate_code = up.affiliate_code,
  onboarding_status = up.onboarding_status,
  onboarding_version = up.onboarding_version,
  onboarding_completed_at = up.onboarding_completed_at,
  required_fields_ok = up.required_fields_ok,
  kid_portion_ratio = up.kid_portion_ratio,
  meals_per_day = up.meals_per_day,
  default_servings_per_recipe = up.default_servings_per_recipe,
  portion_strategy = up.portion_strategy,
  default_servings_rounding = up.default_servings_rounding,
  avatar_url = COALESCE(p.avatar_url, up.avatar_url),
  last_diagnostics_at = COALESCE(p.last_diagnostics_at, up.last_diagnostics_at),
  diagnostics_meta = COALESCE(p.diagnostics_meta, up.diagnostics_meta)
FROM public.user_profiles up
WHERE p.id = up.id;

-- 3) Add unique constraint on referral_code (matches user_profiles)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_referral_code_key ON public.profiles (referral_code) WHERE referral_code IS NOT NULL;

-- 4) Create backward-compatible VIEW so old code/queries still work
-- First rename old table to keep data but avoid name collision
ALTER TABLE public.user_profiles RENAME TO user_profiles_deprecated;

-- Create VIEW with same columns as old user_profiles
CREATE OR REPLACE VIEW public.user_profiles AS
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

-- 5) Make the view updatable via INSTEAD OF triggers
CREATE OR REPLACE FUNCTION public.user_profiles_upsert_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.profiles (id, display_name, avatar_url, referral_code, show_on_leaderboard,
      onboarding_step, onboarding_completed, household_adults, household_children,
      is_affiliate, affiliate_code, onboarding_status, onboarding_version,
      onboarding_completed_at, required_fields_ok, kid_portion_ratio,
      meals_per_day, default_servings_per_recipe, portion_strategy, default_servings_rounding,
      last_diagnostics_at, diagnostics_meta)
    VALUES (NEW.id, NEW.display_name, NEW.avatar_url, NEW.referral_code, COALESCE(NEW.show_on_leaderboard, true),
      COALESCE(NEW.onboarding_step, 0), COALESCE(NEW.onboarding_completed, false),
      COALESCE(NEW.household_adults, 1), COALESCE(NEW.household_children, 0),
      COALESCE(NEW.is_affiliate, false), NEW.affiliate_code,
      COALESCE(NEW.onboarding_status, 'not_started'), COALESCE(NEW.onboarding_version, 1),
      NEW.onboarding_completed_at, COALESCE(NEW.required_fields_ok, false),
      COALESCE(NEW.kid_portion_ratio, 0.6), COALESCE(NEW.meals_per_day, 2),
      COALESCE(NEW.default_servings_per_recipe, 2), COALESCE(NEW.portion_strategy, 'household'),
      COALESCE(NEW.default_servings_rounding, 'nearest_1'),
      NEW.last_diagnostics_at, COALESCE(NEW.diagnostics_meta, '{}'::jsonb))
    ON CONFLICT (id) DO UPDATE SET
      display_name = COALESCE(EXCLUDED.display_name, profiles.display_name),
      avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
      referral_code = COALESCE(EXCLUDED.referral_code, profiles.referral_code),
      show_on_leaderboard = EXCLUDED.show_on_leaderboard,
      onboarding_step = EXCLUDED.onboarding_step,
      onboarding_completed = EXCLUDED.onboarding_completed,
      household_adults = EXCLUDED.household_adults,
      household_children = EXCLUDED.household_children,
      is_affiliate = EXCLUDED.is_affiliate,
      affiliate_code = EXCLUDED.affiliate_code,
      onboarding_status = EXCLUDED.onboarding_status,
      onboarding_version = EXCLUDED.onboarding_version,
      onboarding_completed_at = EXCLUDED.onboarding_completed_at,
      required_fields_ok = EXCLUDED.required_fields_ok,
      kid_portion_ratio = EXCLUDED.kid_portion_ratio,
      meals_per_day = EXCLUDED.meals_per_day,
      default_servings_per_recipe = EXCLUDED.default_servings_per_recipe,
      portion_strategy = EXCLUDED.portion_strategy,
      default_servings_rounding = EXCLUDED.default_servings_rounding,
      updated_at = now();
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.profiles SET
      display_name = NEW.display_name,
      avatar_url = NEW.avatar_url,
      referral_code = NEW.referral_code,
      show_on_leaderboard = NEW.show_on_leaderboard,
      onboarding_step = NEW.onboarding_step,
      onboarding_completed = NEW.onboarding_completed,
      household_adults = NEW.household_adults,
      household_children = NEW.household_children,
      is_affiliate = NEW.is_affiliate,
      affiliate_code = NEW.affiliate_code,
      onboarding_status = NEW.onboarding_status,
      onboarding_version = NEW.onboarding_version,
      onboarding_completed_at = NEW.onboarding_completed_at,
      required_fields_ok = NEW.required_fields_ok,
      kid_portion_ratio = NEW.kid_portion_ratio,
      meals_per_day = NEW.meals_per_day,
      default_servings_per_recipe = NEW.default_servings_per_recipe,
      portion_strategy = NEW.portion_strategy,
      default_servings_rounding = NEW.default_servings_rounding,
      last_diagnostics_at = NEW.last_diagnostics_at,
      diagnostics_meta = NEW.diagnostics_meta,
      updated_at = now()
    WHERE id = NEW.id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Don't actually delete the profile row, just return OLD
    RETURN OLD;
  END IF;
END;
$$;

CREATE TRIGGER user_profiles_view_trigger
  INSTEAD OF INSERT OR UPDATE OR DELETE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.user_profiles_upsert_fn();
