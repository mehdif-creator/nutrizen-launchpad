-- Add foreign key constraint for user_weekly_menu_items -> user_weekly_menus
-- This ensures referential integrity for the shopping list generation

-- First, clean up any orphaned rows (if any exist)
DELETE FROM public.user_weekly_menu_items
WHERE weekly_menu_id NOT IN (SELECT menu_id FROM public.user_weekly_menus);

-- Add the foreign key constraint
ALTER TABLE public.user_weekly_menu_items
ADD CONSTRAINT fk_weekly_menu_items_menu
FOREIGN KEY (weekly_menu_id)
REFERENCES public.user_weekly_menus(menu_id)
ON DELETE CASCADE;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_menu_items_weekly_menu_id
ON public.user_weekly_menu_items(weekly_menu_id);

-- Add index for recipe lookups
CREATE INDEX IF NOT EXISTS idx_menu_items_recipe_id
ON public.user_weekly_menu_items(recipe_id);

-- Add composite index for day/slot queries
CREATE INDEX IF NOT EXISTS idx_menu_items_menu_day_slot
ON public.user_weekly_menu_items(weekly_menu_id, day_of_week, meal_slot);

COMMENT ON CONSTRAINT fk_weekly_menu_items_menu ON public.user_weekly_menu_items IS 
'Links menu items to weekly menus. CASCADE delete removes items when menu is regenerated.';