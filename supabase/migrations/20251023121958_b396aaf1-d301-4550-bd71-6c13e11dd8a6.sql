-- Update user_points initialization to start at 0
UPDATE user_points 
SET total_points = 0, 
    login_streak = 0,
    current_level = 'Bronze'
WHERE user_id IN (
  SELECT user_id FROM user_points WHERE total_points = 7
);

-- Update the init function to set user_points to 0
CREATE OR REPLACE FUNCTION public.init_user_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
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
$function$;