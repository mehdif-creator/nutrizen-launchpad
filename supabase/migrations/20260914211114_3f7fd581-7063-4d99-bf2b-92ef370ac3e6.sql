ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan_selection text,
  ADD COLUMN IF NOT EXISTS plan_selected_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_plan_selection_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_plan_selection_check
      CHECK (plan_selection IS NULL OR plan_selection IN ('trial','starter','premium'));
  END IF;
END $$;