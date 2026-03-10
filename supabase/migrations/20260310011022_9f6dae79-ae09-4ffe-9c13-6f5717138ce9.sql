
-- Table for tracking generated recipes to avoid repetition
CREATE TABLE IF NOT EXISTS public.user_generated_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_name text NOT NULL,
  meal_type text NOT NULL, -- 'dejeuner' | 'diner'
  generated_at timestamptz NOT NULL DEFAULT now(),
  week_start date,
  menu_id uuid
);

CREATE INDEX idx_user_generated_recipes_user_date 
  ON public.user_generated_recipes(user_id, generated_at DESC);

ALTER TABLE public.user_generated_recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own generated recipes"
  ON public.user_generated_recipes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own generated recipes"
  ON public.user_generated_recipes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Add needs_regeneration flag to user_weekly_menus if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_weekly_menus' 
    AND column_name = 'needs_regeneration'
  ) THEN
    ALTER TABLE public.user_weekly_menus 
      ADD COLUMN needs_regeneration boolean DEFAULT false;
  END IF;
END $$;
