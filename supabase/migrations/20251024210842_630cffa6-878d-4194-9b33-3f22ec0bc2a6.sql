-- Fix 1: Enable proper permissions for triggers to insert in stats tables
-- Drop and recreate with correct permissions

-- Drop existing restrictive policies first
DROP POLICY IF EXISTS "Service role and triggers can insert gamification" ON public.user_gamification;
DROP POLICY IF EXISTS "Users can insert their own stats" ON public.user_dashboard_stats;
DROP POLICY IF EXISTS "Users can insert own points" ON public.user_points;

-- Create permissive policies for initial inserts (from triggers)
CREATE POLICY "Allow inserts from triggers" 
ON public.user_gamification FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow inserts from triggers" 
ON public.user_dashboard_stats FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow inserts from triggers" 
ON public.user_points FOR INSERT 
WITH CHECK (true);

-- Fix 2: Ensure the trigger function runs with proper security
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
  
  -- Initialize user_points with all zeros
  INSERT INTO public.user_points (
    user_id,
    total_points,
    current_level,
    login_streak,
    meals_completed,
    meals_generated,
    referrals
  )
  VALUES (NEW.id, 0, 'Bronze', 0, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created_init_stats ON auth.users;
CREATE TRIGGER on_auth_user_created_init_stats
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.init_user_stats();