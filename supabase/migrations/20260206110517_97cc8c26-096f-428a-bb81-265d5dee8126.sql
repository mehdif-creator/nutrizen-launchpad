-- Backfill only menus where all recipes still exist (skip orphaned ones)
INSERT INTO user_weekly_menu_items (weekly_menu_id, recipe_id, day_of_week, meal_slot, target_servings, scale_factor, portion_factor)
SELECT 
  uwm.menu_id,
  (day_data->>'recipe_id')::uuid,
  (row_number() OVER (PARTITION BY uwm.menu_id ORDER BY ordinality))::int,
  'dinner',
  COALESCE((day_data->>'servings_used')::int, 1),
  COALESCE((day_data->>'portion_factor')::numeric, 1.0),
  COALESCE((day_data->>'portion_factor')::numeric, 1.0)
FROM user_weekly_menus uwm
CROSS JOIN LATERAL jsonb_array_elements(uwm.payload->'days') WITH ORDINALITY AS t(day_data, ordinality)
WHERE uwm.payload IS NOT NULL
  AND uwm.payload->'days' IS NOT NULL
  AND uwm.week_start >= '2026-01-01'
  AND NOT EXISTS (SELECT 1 FROM user_weekly_menu_items uwmi WHERE uwmi.weekly_menu_id = uwm.menu_id)
  AND (day_data->>'recipe_id') IS NOT NULL
  AND EXISTS (SELECT 1 FROM recipes r WHERE r.id = (day_data->>'recipe_id')::uuid)
ON CONFLICT DO NOTHING;