-- Ensure user_dashboard_stats has proper defaults
ALTER TABLE public.user_dashboard_stats 
  ALTER COLUMN temps_gagne SET DEFAULT 0,
  ALTER COLUMN charge_mentale_pct SET DEFAULT 0,
  ALTER COLUMN serie_en_cours_set_count SET DEFAULT 0,
  ALTER COLUMN credits_zen SET DEFAULT 10,
  ALTER COLUMN references_count SET DEFAULT 0,
  ALTER COLUMN objectif_hebdos_valide SET DEFAULT 0;

-- Update existing rows to ensure no nulls
UPDATE public.user_dashboard_stats
SET 
  temps_gagne = COALESCE(temps_gagne, 0),
  charge_mentale_pct = COALESCE(charge_mentale_pct, 0),
  serie_en_cours_set_count = COALESCE(serie_en_cours_set_count, 0),
  credits_zen = COALESCE(credits_zen, 10),
  references_count = COALESCE(references_count, 0),
  objectif_hebdos_valide = COALESCE(objectif_hebdos_valide, 0);

-- Create user_gamification table
CREATE TABLE IF NOT EXISTS public.user_gamification (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  streak_days INTEGER NOT NULL DEFAULT 0,
  badges_count INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on user_gamification
ALTER TABLE public.user_gamification ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_gamification
CREATE POLICY "Users can view own gamification"
  ON public.user_gamification FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own gamification"
  ON public.user_gamification FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage gamification"
  ON public.user_gamification FOR ALL
  USING (auth.role() = 'service_role');

-- Function to initialize stats for new users
CREATE OR REPLACE FUNCTION public.init_user_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Initialize dashboard stats
  INSERT INTO public.user_dashboard_stats (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Initialize gamification
  INSERT INTO public.user_gamification (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-initialize stats on user creation
DROP TRIGGER IF EXISTS on_auth_user_created_init_stats ON auth.users;
CREATE TRIGGER on_auth_user_created_init_stats
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.init_user_stats();

-- Backfill existing users
INSERT INTO public.user_gamification (user_id)
SELECT id FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.user_gamification)
ON CONFLICT (user_id) DO NOTHING;