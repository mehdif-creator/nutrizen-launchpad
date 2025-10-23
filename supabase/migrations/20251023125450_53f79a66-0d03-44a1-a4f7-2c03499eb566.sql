-- Populate ingredients_text from ingredients jsonb for all recipes
UPDATE public.recipes
SET ingredients_text = (
  SELECT string_agg(
    COALESCE(ing->>'name', ing->>'ingredient', ing::text), 
    ', '
  )
  FROM jsonb_array_elements(
    CASE 
      WHEN jsonb_typeof(ingredients) = 'array' THEN ingredients
      ELSE '[]'::jsonb
    END
  ) AS ing
)
WHERE ingredients IS NOT NULL 
  AND (ingredients_text IS NULL OR ingredients_text = '');

-- Set diet_type based on goal_tags (NULL = omnivore-friendly)
UPDATE public.recipes
SET diet_type = CASE
  WHEN 'vegetarian' = ANY(goal_tags) OR 'végétarien' = ANY(goal_tags) THEN 'vegetarian'
  WHEN 'vegan' = ANY(goal_tags) OR 'végétalien' = ANY(goal_tags) THEN 'vegan'
  WHEN 'pescatarian' = ANY(goal_tags) OR 'pescatarien' = ANY(goal_tags) THEN 'pescatarian'
  ELSE NULL  -- NULL means suitable for omnivores
END
WHERE diet_type IS NULL AND goal_tags IS NOT NULL;

-- Initialize user_dashboard_stats for all users who don't have it yet
INSERT INTO public.user_dashboard_stats (
  user_id,
  temps_gagne,
  charge_mentale_pct,
  serie_en_cours_set_count,
  credits_zen,
  references_count,
  objectif_hebdos_valide
)
SELECT 
  id,
  0,
  0,
  0,
  10,
  0,
  0
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_dashboard_stats 
  WHERE user_dashboard_stats.user_id = auth.users.id
);