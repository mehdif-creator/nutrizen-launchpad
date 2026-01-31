-- Menu generation job tracking table
CREATE TABLE IF NOT EXISTS public.menu_generation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  week_start date NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'success', 'error')),
  error text,
  constraints_used jsonb DEFAULT '{}'::jsonb,
  retries integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, week_start)
);

-- Enable RLS
ALTER TABLE public.menu_generation_jobs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own menu generation jobs"
  ON public.menu_generation_jobs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage menu generation jobs"
  ON public.menu_generation_jobs
  FOR ALL
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_menu_generation_jobs_user_week 
  ON public.menu_generation_jobs(user_id, week_start);

-- Translation glossary for French culinary terms
CREATE TABLE IF NOT EXISTS public.translation_glossary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_term text NOT NULL,
  target_term text NOT NULL,
  context text NOT NULL DEFAULT 'cuisine',
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (source_term, context)
);

-- Enable RLS
ALTER TABLE public.translation_glossary ENABLE ROW LEVEL SECURITY;

-- Anyone can read glossary
CREATE POLICY "Anyone can view translation glossary"
  ON public.translation_glossary
  FOR SELECT
  USING (true);

-- Only admins can modify glossary
CREATE POLICY "Admins can manage translation glossary"
  ON public.translation_glossary
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Populate with common culinary terms to prevent translation errors
INSERT INTO public.translation_glossary (source_term, target_term, context, notes) VALUES
  ('oven', 'four', 'cuisine', 'Appareil de cuisson - NE JAMAIS traduire en "quatre"'),
  ('stove', 'plaque de cuisson', 'cuisine', 'Surface de cuisson'),
  ('microwave', 'micro-ondes', 'cuisine', 'Appareil électroménager'),
  ('blender', 'mixeur', 'cuisine', 'Robot mixeur'),
  ('airfryer', 'friteuse à air', 'cuisine', 'Appareil de cuisson sans huile'),
  ('range', 'cuisinière', 'cuisine', 'Appareil de cuisson (pas "gamme" ou "portée")'),
  ('serving', 'portion', 'nutrition', 'Quantité individuelle'),
  ('servings', 'portions', 'nutrition', 'Quantités individuelles'),
  ('protein', 'protéines', 'nutrition', 'Macronutriment'),
  ('carbs', 'glucides', 'nutrition', 'Macronutriment'),
  ('fat', 'lipides', 'nutrition', 'Macronutriment'),
  ('fiber', 'fibres', 'nutrition', 'Nutriment'),
  ('flour', 'farine', 'ingredient', 'NE PAS confondre avec "flower"'),
  ('stock', 'bouillon', 'ingredient', 'Bouillon de cuisson')
ON CONFLICT (source_term, context) DO NOTHING;

-- Translation issues table for QA
CREATE TABLE IF NOT EXISTS public.translation_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid REFERENCES public.recipes(id) ON DELETE CASCADE,
  issue_type text NOT NULL,
  problematic_text text NOT NULL,
  suggested_fix text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'fixed', 'ignored')),
  created_at timestamptz DEFAULT now(),
  fixed_at timestamptz
);

-- Enable RLS
ALTER TABLE public.translation_issues ENABLE ROW LEVEL SECURITY;

-- Admins can manage translation issues
CREATE POLICY "Admins can manage translation issues"
  ON public.translation_issues
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role can insert issues (from QA checks)
CREATE POLICY "Service role can insert translation issues"
  ON public.translation_issues
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role'::text);

-- Index for finding open issues
CREATE INDEX IF NOT EXISTS idx_translation_issues_status 
  ON public.translation_issues(status) WHERE status = 'open';

-- Menu generation audit table for constraint tracking
CREATE TABLE IF NOT EXISTS public.menu_generation_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  menu_id uuid,
  week_start date NOT NULL,
  constraints_used jsonb NOT NULL DEFAULT '{}'::jsonb,
  hard_constraint_violations jsonb DEFAULT '[]'::jsonb,
  soft_constraint_relaxations jsonb DEFAULT '[]'::jsonb,
  fallback_level integer DEFAULT 0,
  candidate_recipes_count integer DEFAULT 0,
  final_recipes_count integer DEFAULT 0,
  generation_duration_ms integer,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.menu_generation_audit ENABLE ROW LEVEL SECURITY;

-- Users can view own audit logs
CREATE POLICY "Users can view own menu generation audit"
  ON public.menu_generation_audit
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert audit logs
CREATE POLICY "Service role can insert menu generation audit"
  ON public.menu_generation_audit
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role'::text);

-- Admins can view all audit logs
CREATE POLICY "Admins can view all menu generation audit"
  ON public.menu_generation_audit
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Index for user audits
CREATE INDEX IF NOT EXISTS idx_menu_generation_audit_user 
  ON public.menu_generation_audit(user_id, created_at DESC);

-- Update user_profiles to ensure all portion-related fields exist
DO $$
BEGIN
  -- Add default_servings_rounding if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'default_servings_rounding'
  ) THEN
    ALTER TABLE public.user_profiles 
    ADD COLUMN default_servings_rounding text NOT NULL DEFAULT 'nearest_1';
  END IF;
END $$;