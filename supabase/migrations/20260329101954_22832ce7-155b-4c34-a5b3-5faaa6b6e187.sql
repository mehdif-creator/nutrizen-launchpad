
-- Create a SECURITY DEFINER function that returns only safe leaderboard data
-- This bypasses RLS on profiles but only exposes non-sensitive fields
CREATE OR REPLACE FUNCTION public.get_leaderboard(p_limit int DEFAULT 20)
RETURNS TABLE(
  user_id uuid,
  display_name text,
  avatar_url text,
  total_points bigint,
  level int,
  streak_days int,
  rank bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ugs.user_id,
    p.display_name,
    p.avatar_url,
    ugs.total_points,
    ugs.level,
    ugs.streak_days,
    row_number() OVER (ORDER BY ugs.total_points DESC, ugs.updated_at) AS rank
  FROM user_gamification_state ugs
  JOIN profiles p ON p.id = ugs.user_id
  WHERE p.show_on_leaderboard = true
    AND ugs.total_points > 0
  ORDER BY ugs.total_points DESC, ugs.updated_at
  LIMIT p_limit;
$$;
