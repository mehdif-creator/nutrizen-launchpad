-- Ensure user_dashboard_stats has proper defaults and initialize on user creation
-- Set DEFAULT 0 on all numeric columns
ALTER TABLE public.user_dashboard_stats
  ALTER COLUMN temps_gagne SET DEFAULT 0,
  ALTER COLUMN charge_mentale_pct SET DEFAULT 0,
  ALTER COLUMN serie_en_cours_set_count SET DEFAULT 0,
  ALTER COLUMN credits_zen SET DEFAULT 10,
  ALTER COLUMN references_count SET DEFAULT 0,
  ALTER COLUMN objectif_hebdos_valide SET DEFAULT 0;

-- Normalize existing rows to 0 if null
UPDATE public.user_dashboard_stats
SET
  temps_gagne = COALESCE(temps_gagne, 0),
  charge_mentale_pct = COALESCE(charge_mentale_pct, 0),
  serie_en_cours_set_count = COALESCE(serie_en_cours_set_count, 0),
  credits_zen = COALESCE(credits_zen, 10),
  references_count = COALESCE(references_count, 0),
  objectif_hebdos_valide = COALESCE(objectif_hebdos_valide, 0);

-- Create user_weekly_menus table if not exists
CREATE TABLE IF NOT EXISTS public.user_weekly_menus (
  menu_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  payload jsonb NOT NULL DEFAULT '{"days": []}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, week_start)
);

-- Enable RLS on user_weekly_menus
ALTER TABLE public.user_weekly_menus ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_weekly_menus
CREATE POLICY "Users can manage their own menus"
  ON public.user_weekly_menus
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create index on user_id and week_start for faster queries
CREATE INDEX IF NOT EXISTS idx_user_weekly_menus_user_week 
  ON public.user_weekly_menus(user_id, week_start);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_user_weekly_menus_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_weekly_menus_updated_at
  BEFORE UPDATE ON public.user_weekly_menus
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_weekly_menus_updated_at();

-- Enable realtime for user_weekly_menus
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_weekly_menus;