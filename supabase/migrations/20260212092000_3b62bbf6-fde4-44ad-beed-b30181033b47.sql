
-- Fix: Change v_menu_safety_violations from SECURITY DEFINER to SECURITY INVOKER
CREATE OR REPLACE VIEW public.v_menu_safety_violations
WITH (security_invoker = true)
AS
SELECT
  uwm.user_id,
  umi.recipe_id,
  r.title AS recipe_title,
  umi.meal_slot,
  umi.day_of_week,
  uwm.week_start,
  r.ingredient_keys AS recipe_ingredient_keys,
  p.allergies AS user_allergies,
  p.aliments_eviter AS user_avoid_foods
FROM public.user_weekly_menu_items umi
JOIN public.user_weekly_menus uwm ON uwm.id = umi.weekly_menu_id
JOIN public.recipes r ON r.id = umi.recipe_id
JOIN public.preferences p ON p.user_id = uwm.user_id
WHERE (
  (r.ingredient_keys IS NOT NULL AND p.allergies IS NOT NULL AND r.ingredient_keys && p.allergies)
  OR
  (r.ingredient_keys IS NOT NULL AND p.aliments_eviter IS NOT NULL AND r.ingredient_keys && p.aliments_eviter)
);
