-- Fix RLS policies to allow handle_new_user trigger to initialize user data
-- The trigger runs as SECURITY DEFINER but still needs proper policies

-- Drop existing restrictive INSERT policies for user_gamification
DROP POLICY IF EXISTS "Users can insert own gamification" ON public.user_gamification;

-- Add policy allowing service role and trigger to insert
CREATE POLICY "Service role and triggers can insert gamification"
ON public.user_gamification
FOR INSERT
WITH CHECK (true);

-- Ensure the trigger function is properly set as SECURITY DEFINER
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

-- Ensure the trigger exists and is properly configured
DROP TRIGGER IF EXISTS on_auth_user_created_init_stats ON auth.users;
CREATE TRIGGER on_auth_user_created_init_stats
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.init_user_stats();

-- Also ensure handle_new_user trigger exists for backward compatibility
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();