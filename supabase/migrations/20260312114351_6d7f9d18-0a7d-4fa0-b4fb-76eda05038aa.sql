-- Backfill user_daily_recipes from user_weekly_menu_items for current week
DELETE FROM public.user_daily_recipes 
WHERE date >= date_trunc('week', CURRENT_DATE)::date
  AND date < date_trunc('week', CURRENT_DATE)::date + 7;

INSERT INTO public.user_daily_recipes (user_id, date, lunch_recipe_id, dinner_recipe_id)
SELECT 
  uwm.user_id,
  uwm.week_start + (d.day_idx - 1) as date,
  (SELECT uwmi.recipe_id FROM public.user_weekly_menu_items uwmi 
   WHERE uwmi.weekly_menu_id = uwm.menu_id AND uwmi.day_of_week = d.day_idx AND uwmi.meal_slot = 'lunch' LIMIT 1),
  (SELECT uwmi.recipe_id FROM public.user_weekly_menu_items uwmi 
   WHERE uwmi.weekly_menu_id = uwm.menu_id AND uwmi.day_of_week = d.day_idx AND uwmi.meal_slot = 'dinner' LIMIT 1)
FROM public.user_weekly_menus uwm
CROSS JOIN (VALUES (1),(2),(3),(4),(5),(6),(7)) AS d(day_idx)
WHERE uwm.week_start = date_trunc('week', CURRENT_DATE)::date
ON CONFLICT (user_id, date) DO UPDATE SET
  lunch_recipe_id = EXCLUDED.lunch_recipe_id,
  dinner_recipe_id = EXCLUDED.dinner_recipe_id;