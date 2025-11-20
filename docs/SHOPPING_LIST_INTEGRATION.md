# Shopping List Integration - Documentation

## Overview

The weekly menu generation has been wired to populate the `user_weekly_menu_items` table, enabling the shopping list generation function to work properly.

## Changes Made

### 1. Edge Function: `generate-menu`

**File:** `supabase/functions/generate-menu/index.ts`

After successfully upserting a weekly menu, the function now:

1. **Deletes existing items** for the menu (handles regeneration)
2. **Inserts new menu items** - one row per day:
   - `weekly_menu_id`: FK to `user_weekly_menus.menu_id`
   - `recipe_id`: The selected recipe for that day
   - `day_of_week`: 1-7 (Monday to Sunday)
   - `meal_slot`: 'dinner' (main meal)
   - `target_servings`: Number of portions (adults + 0.7 × children)
   - `scale_factor`: Portion multiplier (target_servings / base_servings)
   - `portion_factor`: Same as scale_factor

### 2. Database Migration

**File:** Migration `20251120_add_menu_items_foreign_key.sql`

Added:
- Foreign key constraint linking `user_weekly_menu_items.weekly_menu_id` → `user_weekly_menus.menu_id`
- CASCADE delete to auto-remove items when menu is regenerated
- Performance indexes:
  - `idx_menu_items_weekly_menu_id`
  - `idx_menu_items_recipe_id`
  - `idx_menu_items_menu_day_slot`

## How It Works

### Menu Generation Flow

```
1. User calls generate-menu edge function
2. Function selects 7 recipes based on preferences
3. Function upserts to user_weekly_menus (creates/updates menu)
4. Function deletes old user_weekly_menu_items for this menu
5. Function inserts 7 new rows into user_weekly_menu_items
6. Shopping list is now ready to be generated
```

### Shopping List Generation

The function `public.generate_shopping_list(user_id, menu_id)` or `public.get_shopping_list_from_weekly_menu(user_id, week_start)`:

1. Reads `user_weekly_menu_items` for the menu
2. For each item, gets the recipe and its ingredients
3. Scales quantities by `portion_factor`
4. Aggregates by ingredient name + canonical unit
5. Returns normalized shopping list

## Testing

### 1. Generate a Menu

```typescript
// From frontend
const { data, error } = await supabase.functions.invoke('generate-menu');
```

### 2. Verify Menu Items Were Created

```sql
-- Get the latest menu
SELECT menu_id, week_start 
FROM public.user_weekly_menus 
WHERE user_id = '<USER_ID>' 
ORDER BY created_at DESC 
LIMIT 1;

-- Check menu items exist
SELECT * 
FROM public.user_weekly_menu_items 
WHERE weekly_menu_id = '<MENU_ID>';
-- Should return 7 rows (one per day)
```

### 3. Generate Shopping List

```sql
-- By menu_id
SELECT * 
FROM public.generate_shopping_list(
  '<USER_ID>'::uuid, 
  '<MENU_ID>'::uuid
);

-- By week (current week)
SELECT * 
FROM public.get_shopping_list_from_weekly_menu(
  '<USER_ID>'::uuid, 
  NULL
);
```

Expected result: List of aggregated ingredients with quantities and units.

## Data Structure

### user_weekly_menu_items

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| weekly_menu_id | uuid | FK to user_weekly_menus.menu_id |
| recipe_id | uuid | FK to recipes.id |
| day_of_week | integer | 1=Mon, 2=Tue, ..., 7=Sun |
| meal_slot | text | 'lunch' or 'dinner' |
| target_servings | integer | Number of portions needed |
| scale_factor | numeric | Multiplier for recipe quantities |
| portion_factor | numeric | Same as scale_factor |
| created_at | timestamptz | Creation timestamp |

## Future Enhancements

### Support Multiple Meals Per Day

Currently, the system generates **1 recipe per day** (dinner). To support lunch + dinner:

1. Modify `generate-menu` to select 14 recipes (7 lunch + 7 dinner)
2. Insert 14 rows into `user_weekly_menu_items`:
   - 7 rows with `meal_slot = 'lunch'`
   - 7 rows with `meal_slot = 'dinner'`
3. Update frontend to display both meals
4. Shopping list will automatically aggregate all 14 meals

### Meal Customization

Users could:
- Swap individual meals (not just entire days)
- Mark meals as "skip" (exclude from shopping list)
- Adjust portions per meal

Implementation: Add `status` column to `user_weekly_menu_items` with values like 'active', 'skipped', 'replaced'.

## Troubleshooting

### Shopping List Returns Empty

**Check 1:** Verify menu items exist
```sql
SELECT COUNT(*) 
FROM user_weekly_menu_items uwmi
JOIN user_weekly_menus uwm ON uwm.menu_id = uwmi.weekly_menu_id
WHERE uwm.user_id = '<USER_ID>'
  AND uwm.week_start = '<WEEK_START>';
```

**Check 2:** Verify recipes have ingredients
```sql
SELECT r.id, r.title, r.ingredients
FROM user_weekly_menu_items uwmi
JOIN recipes r ON r.id = uwmi.recipe_id
WHERE uwmi.weekly_menu_id = '<MENU_ID>';
```

### Stale Menu Items

If regenerating menus and old items persist:
- The edge function deletes old items before inserting new ones
- Check edge function logs for delete errors
- Manually clean: `DELETE FROM user_weekly_menu_items WHERE weekly_menu_id = '<MENU_ID>'`

## Related Files

- Edge function: `supabase/functions/generate-menu/index.ts`
- Frontend hook: `src/hooks/useShoppingList.ts`
- DB functions:
  - `public.generate_shopping_list(user_id, menu_id)`
  - `public.get_shopping_list_from_weekly_menu(user_id, week_start)`
  - `public.normalize_ingredient_line(line_text)`
  - `public.parse_ingredient_line(line_text)`
