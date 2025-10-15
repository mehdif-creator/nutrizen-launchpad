-- Create table for user gamification points
CREATE TABLE IF NOT EXISTS public.user_points (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_points integer NOT NULL DEFAULT 0,
  current_level text NOT NULL DEFAULT 'Bronze',
  login_streak integer NOT NULL DEFAULT 0,
  last_login_date date,
  meals_generated integer NOT NULL DEFAULT 0,
  meals_completed integer NOT NULL DEFAULT 0,
  referrals integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (user_id)
);

-- Enable RLS
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;

-- Users can view and update their own points
CREATE POLICY "Users can view own points"
  ON public.user_points
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own points"
  ON public.user_points
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own points"
  ON public.user_points
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can manage all points
CREATE POLICY "Admins can manage all points"
  ON public.user_points
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger to update updated_at
CREATE TRIGGER update_user_points_updated_at
  BEFORE UPDATE ON public.user_points
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to calculate level based on points
CREATE OR REPLACE FUNCTION public.calculate_user_level(points integer)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN points < 50 THEN 'Bronze'
    WHEN points < 150 THEN 'Silver'
    WHEN points < 300 THEN 'Gold'
    ELSE 'Platinum'
  END;
$$;