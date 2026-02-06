-- Fix stuck users: Create user_profiles for users that have profiles but no user_profiles row
-- This is a backfill for the onboarding issue

-- First, insert missing user_profiles rows for users who have preferences (clearly completed onboarding)
INSERT INTO public.user_profiles (
  id,
  display_name,
  onboarding_completed,
  onboarding_completed_at,
  onboarding_status,
  onboarding_step,
  onboarding_version,
  required_fields_ok,
  household_adults,
  household_children,
  created_at,
  updated_at
)
SELECT 
  pref.user_id,
  COALESCE(pr.full_name, SPLIT_PART(pr.email, '@', 1)),
  true,
  NOW(),
  'completed',
  4,
  1,
  true,
  COALESCE(pref.personnes, 1),
  COALESCE(pref.nombre_enfants, 0),
  COALESCE(pr.created_at, NOW()),
  NOW()
FROM preferences pref
JOIN profiles pr ON pr.id = pref.user_id
LEFT JOIN user_profiles up ON up.id = pref.user_id
WHERE up.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Also create user_profiles for users in profiles table who have no user_profiles row (even without preferences)
-- Mark them as needing onboarding check or complete if they have any menus
INSERT INTO public.user_profiles (
  id,
  display_name,
  onboarding_completed,
  onboarding_completed_at,
  onboarding_status,
  onboarding_step,
  onboarding_version,
  required_fields_ok,
  household_adults,
  household_children,
  created_at,
  updated_at
)
SELECT 
  pr.id,
  COALESCE(pr.full_name, SPLIT_PART(pr.email, '@', 1)),
  -- If they have any weekly menu, they completed onboarding
  CASE WHEN EXISTS (SELECT 1 FROM user_weekly_menus uwm WHERE uwm.user_id = pr.id) THEN true ELSE false END,
  CASE WHEN EXISTS (SELECT 1 FROM user_weekly_menus uwm WHERE uwm.user_id = pr.id) THEN NOW() ELSE NULL END,
  CASE WHEN EXISTS (SELECT 1 FROM user_weekly_menus uwm WHERE uwm.user_id = pr.id) THEN 'completed' ELSE 'not_started' END,
  CASE WHEN EXISTS (SELECT 1 FROM user_weekly_menus uwm WHERE uwm.user_id = pr.id) THEN 4 ELSE 0 END,
  1,
  CASE WHEN EXISTS (SELECT 1 FROM user_weekly_menus uwm WHERE uwm.user_id = pr.id) THEN true ELSE false END,
  1,
  0,
  COALESCE(pr.created_at, NOW()),
  NOW()
FROM profiles pr
LEFT JOIN user_profiles up ON up.id = pr.id
WHERE up.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Also create user_dashboard_stats for users who don't have it
INSERT INTO public.user_dashboard_stats (
  user_id,
  credits_zen,
  temps_gagne,
  charge_mentale_pct,
  serie_en_cours_set_count,
  references_count,
  objectif_hebdos_valide,
  created_at
)
SELECT 
  pr.id,
  10, -- Default starting credits
  0,
  15,
  0,
  0,
  0,
  NOW()
FROM profiles pr
LEFT JOIN user_dashboard_stats uds ON uds.user_id = pr.id
WHERE uds.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;