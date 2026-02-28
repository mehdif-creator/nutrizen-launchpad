-- Trigger: keep profiles.meals_per_day in sync with preferences.repas_par_jour
CREATE OR REPLACE FUNCTION public.sync_meals_per_day()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.repas_par_jour IS NOT NULL THEN
    UPDATE public.profiles
    SET meals_per_day = NEW.repas_par_jour
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_meals_per_day_trigger ON public.preferences;
CREATE TRIGGER sync_meals_per_day_trigger
  AFTER INSERT OR UPDATE OF repas_par_jour ON public.preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_meals_per_day();

-- Backfill all existing users
UPDATE public.profiles p
SET meals_per_day = pr.repas_par_jour
FROM public.preferences pr
WHERE pr.user_id = p.id
AND pr.repas_par_jour IS NOT NULL;