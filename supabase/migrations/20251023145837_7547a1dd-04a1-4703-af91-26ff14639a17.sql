-- Ensure ingredients_text is populated for all recipes and trim spaces
UPDATE public.recipes
SET ingredients_text = lower(trim(coalesce(ingredients::text, '')))
WHERE ingredients_text IS NULL OR ingredients_text = '' OR ingredients_text != lower(trim(coalesce(ingredients::text, '')));

-- Clean up user preferences: trim spaces from excluded ingredients
UPDATE public.preferences
SET aliments_eviter = (
  SELECT array_agg(trim(ingredient))
  FROM unnest(aliments_eviter) AS ingredient
  WHERE trim(ingredient) != ''
)
WHERE aliments_eviter IS NOT NULL 
AND EXISTS (
  SELECT 1 FROM unnest(aliments_eviter) AS ing
  WHERE trim(ing) != ing OR ing = ''
);