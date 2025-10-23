-- Ensure appliances has proper default
ALTER TABLE public.recipes 
ALTER COLUMN appliances SET DEFAULT '{}'::text[];

-- Update existing NULL appliances to empty array
UPDATE public.recipes 
SET appliances = '{}'::text[]
WHERE appliances IS NULL;

-- Update existing NULL appliances_owned in preferences
UPDATE public.preferences 
SET appliances_owned = '{}'::text[]
WHERE appliances_owned IS NULL;