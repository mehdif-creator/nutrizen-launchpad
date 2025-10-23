-- Add missing columns to recipes table
ALTER TABLE public.recipes
ADD COLUMN IF NOT EXISTS appliances text[] DEFAULT '{}'::text[],
ADD COLUMN IF NOT EXISTS image_path text,
ADD COLUMN IF NOT EXISTS ingredients_text text;

-- Add missing column to preferences table  
ALTER TABLE public.preferences
ADD COLUMN IF NOT EXISTS appliances_owned text[] DEFAULT '{}'::text[];

-- Set DEFAULT 0 on user_dashboard_stats numeric columns
ALTER TABLE public.user_dashboard_stats
ALTER COLUMN temps_gagne SET DEFAULT 0,
ALTER COLUMN charge_mentale_pct SET DEFAULT 0,
ALTER COLUMN serie_en_cours_set_count SET DEFAULT 0,
ALTER COLUMN credits_zen SET DEFAULT 10,
ALTER COLUMN references_count SET DEFAULT 0,
ALTER COLUMN objectif_hebdos_valide SET DEFAULT 0;

-- Normalize existing NULL values in user_dashboard_stats
UPDATE public.user_dashboard_stats
SET temps_gagne = COALESCE(temps_gagne, 0),
    charge_mentale_pct = COALESCE(charge_mentale_pct, 0),
    serie_en_cours_set_count = COALESCE(serie_en_cours_set_count, 0),
    credits_zen = COALESCE(credits_zen, 10),
    references_count = COALESCE(references_count, 0),
    objectif_hebdos_valide = COALESCE(objectif_hebdos_valide, 0);

-- Set DEFAULT 0 on user_gamification numeric columns
ALTER TABLE public.user_gamification
ALTER COLUMN points SET DEFAULT 0,
ALTER COLUMN level SET DEFAULT 1,
ALTER COLUMN streak_days SET DEFAULT 0,
ALTER COLUMN badges_count SET DEFAULT 0;

-- Normalize existing NULL values in user_gamification
UPDATE public.user_gamification
SET points = COALESCE(points, 0),
    level = COALESCE(level, 1),
    streak_days = COALESCE(streak_days, 0),
    badges_count = COALESCE(badges_count, 0);

-- Update the init_user_stats function to ensure zero initialization
CREATE OR REPLACE FUNCTION public.init_user_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Initialize dashboard stats with all zeros
  INSERT INTO public.user_dashboard_stats (
    user_id, 
    temps_gagne, 
    charge_mentale_pct, 
    serie_en_cours_set_count, 
    credits_zen, 
    references_count, 
    objectif_hebdos_valide
  )
  VALUES (NEW.id, 0, 0, 0, 10, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Initialize gamification with all zeros
  INSERT INTO public.user_gamification (
    user_id,
    points,
    level,
    streak_days,
    badges_count
  )
  VALUES (NEW.id, 0, 1, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Comment explaining the trigger behavior
COMMENT ON FUNCTION public.init_user_stats() IS 'Initializes user_dashboard_stats and user_gamification with zero values for new users';