
-- Fix security definer view by making it SECURITY INVOKER (default for views)
DROP VIEW IF EXISTS public.gamification_leaderboard;
CREATE VIEW public.gamification_leaderboard 
WITH (security_invoker = true)
AS
SELECT 
  ugs.user_id,
  p.display_name,
  p.avatar_url,
  ugs.total_points,
  ugs.level,
  ugs.streak_days,
  ROW_NUMBER() OVER (ORDER BY ugs.total_points DESC, ugs.updated_at ASC) AS rank
FROM user_gamification_state ugs
JOIN profiles p ON p.id = ugs.user_id
WHERE p.show_on_leaderboard = true
  AND ugs.total_points > 0;

-- Grant select on the view
GRANT SELECT ON public.gamification_leaderboard TO authenticated;
