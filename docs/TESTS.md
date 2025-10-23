# NutriZen Backend Tests & Smoke Scripts

## 1. Database Initialization Tests

### Test 1.1: New User Zero Initialization
```sql
-- Create a test user (or use existing user_id)
-- Verify dashboard stats are initialized to 0

SELECT 
  user_id,
  temps_gagne,
  charge_mentale_pct,
  serie_en_cours_set_count,
  credits_zen,
  references_count,
  objectif_hebdos_valide
FROM user_dashboard_stats
WHERE user_id = 'YOUR_TEST_USER_ID';

-- Expected: All values should be 0 (except credits_zen = 10)
```

### Test 1.2: Gamification Initialization
```sql
SELECT 
  user_id,
  points,
  level,
  streak_days,
  badges_count
FROM user_gamification
WHERE user_id = 'YOUR_TEST_USER_ID';

-- Expected: points=0, level=1, streak_days=0, badges_count=0
```

### Test 1.3: Call init-user-rows Edge Function
```bash
curl -X POST 'https://pghdaozgxkbtsxwydemd.supabase.co/functions/v1/init-user-rows' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"user_id": "YOUR_TEST_USER_ID"}'

# Expected: {"success":true,"message":"User rows initialized successfully"}
```

---

## 2. Menu Generation Tests

### Test 2.1: Generic Profile Menu Generation
```sql
-- Set up a generic profile (minimal preferences)
UPDATE preferences
SET 
  type_alimentation = NULL,
  temps_preparation = NULL,
  cuisine_preferee = NULL,
  appliances_owned = '{oven,stove}',
  aliments_eviter = NULL,
  allergies = NULL
WHERE user_id = 'YOUR_TEST_USER_ID';
```

```bash
curl -X POST 'https://pghdaozgxkbtsxwydemd.supabase.co/functions/v1/generate-menu' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json'

# Expected: 
# - success: true
# - days: array of 7 recipes
# - usedFallback: may be true
# - fallbackLevel: 0-4
```

### Test 2.2: Verify Menu Persistence
```sql
-- Check that menu was saved to DB
SELECT 
  menu_id,
  user_id,
  week_start,
  jsonb_array_length(payload->'days') as day_count,
  created_at
FROM user_weekly_menus
WHERE user_id = 'YOUR_TEST_USER_ID'
ORDER BY week_start DESC, created_at DESC
LIMIT 1;

-- Expected: day_count = 7
```

### Test 2.3: Airfryer Exclusion Test
```sql
-- Set preferences to NOT own airfryer
UPDATE preferences
SET appliances_owned = '{oven,stove}'  -- no airfryer
WHERE user_id = 'YOUR_TEST_USER_ID';
```

```bash
# Generate menu
curl -X POST 'https://pghdaozgxkbtsxwydemd.supabase.co/functions/v1/generate-menu' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json'
```

```sql
-- Verify NO recipes with airfryer were selected
SELECT 
  day->>'title' as title,
  day->>'recipe_id' as recipe_id
FROM user_weekly_menus,
     jsonb_array_elements(payload->'days') as day
WHERE user_id = 'YOUR_TEST_USER_ID'
  AND week_start = (
    SELECT MAX(week_start) 
    FROM user_weekly_menus 
    WHERE user_id = 'YOUR_TEST_USER_ID'
  );

-- Then check each recipe doesn't have airfryer
SELECT 
  id,
  title,
  appliances
FROM recipes
WHERE id IN (
  SELECT (day->>'recipe_id')::uuid
  FROM user_weekly_menus,
       jsonb_array_elements(payload->'days') as day
  WHERE user_id = 'YOUR_TEST_USER_ID'
    AND week_start = (SELECT MAX(week_start) FROM user_weekly_menus WHERE user_id = 'YOUR_TEST_USER_ID')
);

-- Expected: NO recipes with 'airfryer' in appliances array
```

### Test 2.4: Ingredient Exclusion Test
```sql
-- Add excluded ingredients
UPDATE preferences
SET aliments_eviter = ARRAY['peanut', 'shellfish']
WHERE user_id = 'YOUR_TEST_USER_ID';
```

```bash
# Generate menu
curl -X POST 'https://pghdaozgxkbtsxwydemd.supabase.co/functions/v1/generate-menu' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json'
```

```sql
-- Verify NO recipes contain excluded ingredients
SELECT 
  r.id,
  r.title,
  r.ingredients_text
FROM recipes r
WHERE r.id IN (
  SELECT (day->>'recipe_id')::uuid
  FROM user_weekly_menus,
       jsonb_array_elements(payload->'days') as day
  WHERE user_id = 'YOUR_TEST_USER_ID'
    AND week_start = (SELECT MAX(week_start) FROM user_weekly_menus WHERE user_id = 'YOUR_TEST_USER_ID')
)
AND (
  lower(r.ingredients_text) LIKE '%peanut%'
  OR lower(r.ingredients_text) LIKE '%shellfish%'
);

-- Expected: 0 rows (no matches)
```

### Test 2.5: Time Constraint Test
```sql
-- Set strict time constraints
UPDATE preferences
SET temps_preparation = '<10 min'
WHERE user_id = 'YOUR_TEST_USER_ID';
```

```bash
# Generate menu (may use fallback)
curl -X POST 'https://pghdaozgxkbtsxwydemd.supabase.co/functions/v1/generate-menu' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json'
```

```sql
-- Check prep times (may be relaxed if fallback used)
SELECT 
  r.id,
  r.title,
  r.prep_time_min,
  r.total_time_min
FROM recipes r
WHERE r.id IN (
  SELECT (day->>'recipe_id')::uuid
  FROM user_weekly_menus,
       jsonb_array_elements(payload->'days') as day
  WHERE user_id = 'YOUR_TEST_USER_ID'
    AND week_start = (SELECT MAX(week_start) FROM user_weekly_menus WHERE user_id = 'YOUR_TEST_USER_ID')
);

-- Expected: Most recipes should be quick (unless fallback was used)
```

### Test 2.6: Calorie Range Test
```sql
-- Set calorie target
UPDATE preferences
SET objectif_calorique = '1500-1800 kcal'  -- 375-600 kcal per meal
WHERE user_id = 'YOUR_TEST_USER_ID';
```

```bash
# Generate menu
curl -X POST 'https://pghdaozgxkbtsxwydemd.supabase.co/functions/v1/generate-menu' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json'
```

```sql
-- Check calorie range
SELECT 
  r.id,
  r.title,
  r.calories_kcal,
  CASE 
    WHEN r.calories_kcal BETWEEN 375 AND 600 THEN '✓ In range'
    ELSE '✗ Out of range'
  END as status
FROM recipes r
WHERE r.id IN (
  SELECT (day->>'recipe_id')::uuid
  FROM user_weekly_menus,
       jsonb_array_elements(payload->'days') as day
  WHERE user_id = 'YOUR_TEST_USER_ID'
    AND week_start = (SELECT MAX(week_start) FROM user_weekly_menus WHERE user_id = 'YOUR_TEST_USER_ID')
);

-- Expected: Most recipes in 375-600 range (unless fallback was used)
```

---

## 3. Frontend Integration Tests

### Test 3.1: Dashboard Zero Display
**Manual Test:**
1. Log in as a new user
2. Navigate to dashboard
3. Verify all KPIs show 0 (or 10 for credits)
4. Check that gamification badge shows "Bronze • 0 pts"

### Test 3.2: Menu Persistence
**Manual Test:**
1. Generate a menu on dashboard
2. Navigate to another page
3. Return to dashboard
4. Verify the same menu is still displayed (loaded from DB)

### Test 3.3: Recipe Detail Routing
**Manual Test:**
1. On dashboard, click "Voir la recette" on any meal card
2. Verify URL is `/app/recipes/[recipe_id]`
3. Verify recipe details page loads with correct recipe
4. Verify image renders

### Test 3.4: Image Rendering
**Manual Test:**
1. Check that recipe images display on:
   - Dashboard meal cards
   - Recipe detail page
2. If image missing, verify placeholder is shown
3. Open browser DevTools Network tab
4. Verify image URLs are either:
   - Direct URLs: `https://PROJECT.supabase.co/storage/v1/object/public/...`
   - Signed URLs: `https://PROJECT.supabase.co/storage/v1/object/sign/...`

### Test 3.5: Realtime Updates
**Manual Test:**
1. Open dashboard in two browser tabs
2. In tab 1, click "Régénérer la semaine"
3. In tab 2, verify menu updates automatically (no page refresh needed)

---

## 4. Performance Tests

### Test 4.1: Query Performance
```sql
-- Test menu generation query (should complete in <500ms)
EXPLAIN ANALYZE
SELECT 
  id, title, prep_time_min, total_time_min, 
  calories_kcal, proteins_g, appliances, 
  image_url, image_path, ingredients_text
FROM recipes
WHERE published = true
  AND prep_time_min <= 30
  AND total_time_min <= 60
  AND calories_kcal BETWEEN 300 AND 600
  AND NOT ('airfryer' = ANY(appliances))
  AND (ingredients_text IS NULL OR NOT (
    lower(ingredients_text) LIKE '%peanut%'
    OR lower(ingredients_text) LIKE '%shellfish%'
  ))
LIMIT 100;

-- Expected: Execution time < 500ms with proper indexes
```

### Test 4.2: Index Usage
```sql
-- Check if indexes are being used
SELECT * FROM check_index_usage('recipes');

-- Expected: idx_recipes_prep_time, idx_recipes_total_time, 
--           idx_recipes_calories should have idx_scan > 0
```

---

## 5. Security Tests

### Test 5.1: RLS Policy Enforcement
```bash
# Try to access another user's menu (should fail)
curl -X GET 'https://pghdaozgxkbtsxwydemd.supabase.co/rest/v1/user_weekly_menus?user_id=eq.OTHER_USER_ID' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'apikey: YOUR_ANON_KEY'

# Expected: Empty array or 403 Forbidden
```

### Test 5.2: Input Validation
```bash
# Try invalid user_id format
curl -X POST 'https://pghdaozgxkbtsxwydemd.supabase.co/functions/v1/init-user-rows' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"user_id": "not-a-uuid"}'

# Expected: 400 Bad Request with validation error
```

### Test 5.3: Unauthorized Access
```bash
# Try to call edge function without auth token
curl -X POST 'https://pghdaozgxkbtsxwydemd.supabase.co/functions/v1/generate-menu' \
  -H 'Content-Type: application/json'

# Expected: 401 Unauthorized or 403 Forbidden
```

---

## 6. Edge Function Logs

### Check Logs for Errors
```bash
# Via Supabase CLI (if available)
supabase functions logs generate-menu

# Or via Supabase Dashboard:
# https://supabase.com/dashboard/project/pghdaozgxkbtsxwydemd/functions/generate-menu/logs
```

### Expected Log Output (Success)
```
[generate-menu] Processing request for user: abc-123
[generate-menu] User preferences: Found
[generate-menu] Building query for fallback level: 0
[generate-menu] Enforcing allergen exclusions: gluten
[generate-menu] Enforcing ingredient exclusions: peanut, shellfish
[generate-menu] Excluding airfryer recipes (not owned)
[generate-menu] Max prep time: 30 min
[generate-menu] F0 yielded 45 recipes
[generate-menu] Selected 7 recipes for the week
[generate-menu] Upserting menu for week starting: 2025-01-20
[generate-menu] Menu saved successfully. Menu ID: xyz-789
```

---

## 7. Regression Tests

### Test 7.1: Fallback Ladder Respects Exclusions
```sql
-- Create a very restrictive profile
UPDATE preferences
SET 
  temps_preparation = '<10 min',
  type_alimentation = 'Végétalien',
  cuisine_preferee = ARRAY['Japanese'],
  aliments_eviter = ARRAY['soy', 'gluten'],
  allergies = ARRAY['Fruits à coque'],
  appliances_owned = '{microwave}'  -- very limited
WHERE user_id = 'YOUR_TEST_USER_ID';
```

```bash
# Generate menu (will likely use high fallback level)
curl -X POST 'https://pghdaozgxkbtsxwydemd.supabase.co/functions/v1/generate-menu' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json'
```

```sql
-- Verify NO excluded ingredients appear despite fallback
SELECT 
  r.id,
  r.title,
  r.ingredients_text,
  r.appliances,
  CASE 
    WHEN lower(r.ingredients_text) LIKE '%soy%' THEN '✗ Contains soy'
    WHEN lower(r.ingredients_text) LIKE '%gluten%' THEN '✗ Contains gluten'
    WHEN 'airfryer' = ANY(r.appliances) THEN '✗ Requires airfryer'
    WHEN 'oven' = ANY(r.appliances) THEN '✗ Requires oven'
    ELSE '✓ OK'
  END as check_result
FROM recipes r
WHERE r.id IN (
  SELECT (day->>'recipe_id')::uuid
  FROM user_weekly_menus,
       jsonb_array_elements(payload->'days') as day
  WHERE user_id = 'YOUR_TEST_USER_ID'
    AND week_start = (SELECT MAX(week_start) FROM user_weekly_menus WHERE user_id = 'YOUR_TEST_USER_ID')
);

-- Expected: ALL rows show '✓ OK' (no exclusions violated)
```

---

## Summary Checklist

- [ ] New user initialization creates zero rows
- [ ] Menu generation works for generic profile
- [ ] Airfryer exclusion enforced
- [ ] Ingredient exclusions enforced
- [ ] Time constraints respected (or fallback used)
- [ ] Calorie range respected (or fallback used)
- [ ] Menu persists across navigation
- [ ] Recipe detail routing works
- [ ] Images render correctly
- [ ] Realtime updates work
- [ ] RLS policies prevent unauthorized access
- [ ] Edge functions validate input
- [ ] Query performance < 500ms
- [ ] Indexes are being used
- [ ] Fallback ladder respects exclusions at all levels

**All tests passing = Backend is production-ready!**
