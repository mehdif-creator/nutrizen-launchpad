# NutriZen Integration Tests

## Prerequisites
- Supabase project running
- At least 10 recipes in `public.recipes` table
- User account created

## 1. Zero Initialization Test

### SQL Check
```sql
-- Check that stats default to 0
SELECT 
  user_id,
  temps_gagne,
  charge_mentale_pct,
  serie_en_cours_set_count,
  credits_zen,
  references_count,
  objectif_hebdos_valide
FROM user_dashboard_stats
WHERE user_id = 'YOUR_USER_ID';

-- Expected: All 0 except credits_zen = 10
```

### UI Check
1. Login as new user
2. Navigate to `/app`
3. Verify all KPI cards show 0:
   - Temps gagné: +0h
   - Charge mentale: -0%
   - Série en cours: 0 jours
   - Crédits Zen: 10/10
   - Références: 0
   - Objectif hebdo: 0/5 repas validés

**✅ Pass:** All stats display 0 (10 for credits)  
**❌ Fail:** Any stat shows null, undefined, or random value

---

## 2. Preferences → Menu Generation Test

### Setup
```sql
-- Insert user preferences
INSERT INTO preferences (user_id, diet_tags, max_prep_min, max_total_min, cal_min, cal_max, min_proteins_g, excluded_ingredients, appliances_owned)
VALUES (
  'YOUR_USER_ID',
  ARRAY['vegetarian'],
  30,
  60,
  400,
  700,
  20,
  ARRAY['nuts', 'shellfish'],
  ARRAY['oven', 'stovetop']
);
```

### Test Steps
1. Navigate to `/app/profile` or preferences page
2. Save preferences (or ensure they exist)
3. Click "Générer ma semaine" on dashboard
4. Wait for toast: "✅ Menu généré !"
5. Verify 7 meal cards appear with:
   - Day labels (Lundi → Dimanche)
   - Recipe titles
   - Prep time (≤ 30 min based on prefs)
   - Calories (~400-700 range)
   - Images (or fallback)

6. Navigate away (`/app/profile`)
7. Navigate back to `/app`
8. Verify menu still appears (persisted)

**✅ Pass:** Menu generates, persists, and matches preferences  
**❌ Fail:** Menu disappears, shows wrong recipes, or errors

---

## 3. Filter Enforcement Test

### Test A: Appliance Exclusion
```sql
-- User owns only oven and stovetop (no airfryer)
UPDATE preferences
SET appliances_owned = ARRAY['oven', 'stovetop']
WHERE user_id = 'YOUR_USER_ID';
```

1. Regenerate menu
2. Check all 7 recipes
3. **Expected:** NO recipes requiring airfryer
4. **Verify:**
```sql
SELECT r.title, r.appliances
FROM user_weekly_menus uwm
CROSS JOIN LATERAL jsonb_array_elements(uwm.payload->'days') AS d
JOIN recipes r ON r.id::text = d->>'recipe_id'
WHERE uwm.user_id = 'YOUR_USER_ID'
AND 'airfryer' = ANY(r.appliances);

-- Should return 0 rows
```

**✅ Pass:** No airfryer recipes  
**❌ Fail:** Any airfryer recipe in menu

### Test B: Ingredient Exclusion
```sql
-- Exclude nuts and shellfish
UPDATE preferences
SET excluded_ingredients = ARRAY['nuts', 'shellfish', 'peanut']
WHERE user_id = 'YOUR_USER_ID';
```

1. Regenerate menu
2. Click "Voir la recette" on each meal
3. **Expected:** No ingredients containing nuts, shellfish, or peanut
4. **Verify:**
```sql
SELECT r.title, r.ingredients_text
FROM user_weekly_menus uwm
CROSS JOIN LATERAL jsonb_array_elements(uwm.payload->'days') AS d
JOIN recipes r ON r.id::text = d->>'recipe_id'
WHERE uwm.user_id = 'YOUR_USER_ID'
AND (
  lower(r.ingredients_text) LIKE '%nuts%'
  OR lower(r.ingredients_text) LIKE '%shellfish%'
  OR lower(r.ingredients_text) LIKE '%peanut%'
);

-- Should return 0 rows
```

**✅ Pass:** No excluded ingredients  
**❌ Fail:** Any excluded ingredient found

---

## 4. Fallback Ladder Test

### Setup: Hyper-Restrictive Preferences
```sql
UPDATE preferences
SET 
  diet_tags = ARRAY['vegan', 'gluten-free'],
  cuisines = ARRAY['japanese'],
  courses = ARRAY['breakfast'],
  max_prep_min = 5,
  max_total_min = 10,
  cal_min = 100,
  cal_max = 200,
  min_proteins_g = 50,
  excluded_ingredients = ARRAY['soy', 'tofu', 'tempeh', 'nuts', 'seeds']
WHERE user_id = 'YOUR_USER_ID';
```

### Test Steps
1. Click "Régénérer la semaine"
2. **Expected:** 
   - Menu still generates (7 recipes)
   - Banner appears: "ℹ️ Menu généré avec filtres assouplis..."
   - Toast: "Menu généré avec filtres assouplis (allergies respectées)."
3. Verify exclusions are STILL enforced (check ingredients)

**✅ Pass:** 7 recipes generated, fallback banner shown, exclusions respected  
**❌ Fail:** <7 recipes, no banner, or exclusions violated

---

## 5. Images Test

### Test A: Recipe Cards
1. Generate menu
2. Inspect each of 7 meal cards
3. **Expected:** 
   - Image renders (from `image_url` or `image_path`)
   - OR fallback to `/img/hero-default.png`

### Test B: Recipe Detail
1. Click "Voir la recette" on any meal
2. Navigate to `/app/recipes/:id`
3. **Expected:**
   - Hero image renders at top (or fallback)
   - No broken image icon

**✅ Pass:** All images load (or fallback)  
**❌ Fail:** Broken image icon appears

---

## 6. Routing Test

### Test Steps
1. On dashboard, click "Voir la recette" for "Lundi" meal
2. **Expected URL:** `/app/recipes/{uuid}`
3. Page displays:
   - Recipe title
   - Prep/cook time
   - Calories, macros
   - Ingredients list
   - Instructions
   - Appliances & allergens

**✅ Pass:** Correct recipe loads with all details  
**❌ Fail:** 404, wrong recipe, or missing data

---

## 7. Realtime Update Test

### Test Steps
1. Open dashboard in Browser A
2. Open dashboard in Browser B (same user)
3. In Browser A: Click "Régénérer la semaine"
4. Wait ~2 seconds
5. **Expected:** Browser B auto-updates with new menu (no manual refresh)

**✅ Pass:** Browser B shows new menu automatically  
**❌ Fail:** Browser B requires manual refresh

---

## 8. Security Test

### Test A: RLS - Other User's Data
```sql
-- Try to read another user's menu (should fail)
SELECT * FROM user_weekly_menus
WHERE user_id != 'YOUR_USER_ID'
LIMIT 1;

-- Expected: 0 rows (blocked by RLS)
```

### Test B: Client Can't Access Service Role
1. Open browser DevTools → Network tab
2. Generate menu
3. **Expected:** Request uses anon key in Authorization header
4. **Verify:** No service_role key visible in any client request

**✅ Pass:** RLS blocks, service key not exposed  
**❌ Fail:** Other user's data visible, or service key leaked

---

## 9. Edge Function Direct Test (cURL)

```bash
# Get session token
curl -X POST 'https://pghdaozgxkbtsxwydemd.supabase.co/auth/v1/token?grant_type=password' \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# Extract access_token from response, then:

curl -X POST 'https://pghdaozgxkbtsxwydemd.supabase.co/functions/v1/generate-menu' \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'

# Expected response:
{
  "success": true,
  "menu_id": "uuid",
  "week_start": "2025-01-20",
  "usedFallback": false,
  "days": [ ... 7 days ... ]
}
```

**✅ Pass:** 200 OK, success=true, 7 days  
**❌ Fail:** Error, success=false, or <7 days

---

## 10. Performance Test

### SQL: Check Indexes
```sql
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('recipes', 'user_weekly_menus', 'preferences')
ORDER BY tablename, indexname;
```

**Expected Indexes:**
- `recipes`: prep_time, total_time, calories, proteins, appliances (GIN), allergens (GIN)
- `user_weekly_menus`: (user_id, week_start DESC)
- `preferences`: (user_id)

### UI: Generation Speed
1. Click "Générer ma semaine"
2. Measure time until toast appears
3. **Target:** <3 seconds (for 50-100 recipes in DB)

**✅ Pass:** All indexes exist, <3s generation  
**❌ Fail:** Missing indexes, or >5s generation

---

## Summary Checklist

- [ ] 1. Zero initialization (stats = 0)
- [ ] 2. Menu generates and persists
- [ ] 3. Filters enforced (appliances, exclusions)
- [ ] 4. Fallback works (restrictive prefs)
- [ ] 5. Images load (cards + detail)
- [ ] 6. Routing works (correct recipe)
- [ ] 7. Realtime updates (auto-refresh)
- [ ] 8. Security (RLS, no service key)
- [ ] 9. Edge function (cURL test)
- [ ] 10. Performance (indexes, speed)

**All ✅ = Integration Complete 🎉**
