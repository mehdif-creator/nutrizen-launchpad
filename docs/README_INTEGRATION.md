# NutriZen - Backend + Frontend Perfect Integration

## Overview

Complete integration of NutriZen with zero-based KPIs, persistent weekly menus, proper image handling, and tight backend-frontend contracts.

## Architecture

**Stack:**
- Frontend: React 18 + Vite + TypeScript
- Backend: Supabase (Postgres, Edge Functions, Storage, Realtime)
- Styling: Tailwind CSS + shadcn/ui
- State: TanStack Query v5 + React Context
- Locale: fr-FR (Europe/Paris)

## Environment Variables

### Client-side (.env)
```bash
VITE_SUPABASE_URL=https://pghdaozgxkbtsxwydemd.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### Server-side (Supabase Secrets)
- `SUPABASE_URL` - Auto-configured
- `SUPABASE_SERVICE_ROLE_KEY` - Auto-configured (never exposed to client)
- `SUPABASE_ANON_KEY` - Auto-configured

## Database Schema

### Core Tables

**`preferences`** - User dietary preferences
- `user_id` (uuid, PK)
- `diet_tags` (text[]) - e.g., vegetarian, vegan
- `cuisines` (text[]) - preferred cuisines
- `courses` (text[]) - meal types
- `max_prep_min` (int) - max preparation time
- `max_total_min` (int) - max total time
- `cal_min`, `cal_max` (int) - calorie range
- `min_proteins_g` (int) - minimum proteins
- `excluded_ingredients` (text[]) - ALWAYS enforced
- `appliances_owned` (text[]) - owned appliances

**`recipes`** - Recipe catalog
- `id` (uuid, PK)
- `title` (text)
- `prep_min`, `total_min` (int)
- `calories`, `proteins` (numeric)
- `tags` (text[]) - diet tags
- `appliances` (text[]) - required appliances
- `ingredients` (jsonb)
- `ingredients_text` (text) - for fast filtering
- `cuisine`, `course` (text)
- `image_url`, `image_path` (text)

**`user_weekly_menus`** - Generated menus
- `menu_id` (uuid, PK)
- `user_id` (uuid)
- `week_start` (date)
- `payload` (jsonb) - contains days array
- UNIQUE constraint on `(user_id, week_start)`

**`user_dashboard_stats`** - KPI tracking
- All fields default to 0
- `temps_gagne`, `charge_mentale_pct`, `serie_en_cours_set_count`
- `credits_zen` (default 10), `references_count`, `objectif_hebdos_valide`

**`user_gamification`** - Gamification data
- All fields default to 0
- `points`, `level`, `streak_days`, `badges_count`

## Backend Contracts

### Edge Function: `generate-menu`

**Endpoint:** `POST /functions/v1/generate-menu`

**Request:**
```json
{
  "week_start": "YYYY-MM-DD" // optional
}
```

**Response:**
```json
{
  "success": true,
  "menu_id": "uuid",
  "week_start": "2025-01-20",
  "usedFallback": false,
  "fallbackLevel": 0,
  "days": [
    {
      "day": "Lundi",
      "recipe_id": "uuid",
      "title": "Poulet au curry",
      "image_url": "https://...",
      "prep_min": 15,
      "total_min": 30,
      "calories": 520,
      "macros": {
        "proteins_g": 35,
        "carbs_g": 45,
        "fats_g": 18
      }
    }
    // ... 6 more days
  ]
}
```

**Filter Logic:**
1. Load user preferences
2. Query recipes with filters:
   - **ALWAYS enforced:** allergens, excluded_ingredients, appliances
   - **Optional:** time limits, calories, proteins, diet tags, cuisines, courses
3. Fallback ladder (if insufficient recipes):
   - F0: Strict (all filters)
   - F1: Widen time constraints (+10 prep, +15 total)
   - F2: Ignore diet tags
   - F3: Ignore cuisines/courses
   - F4: Safe pool (common tags)
4. Select 7 distinct recipes (allow repeats if <7 available)
5. Upsert into `user_weekly_menus`

### Edge Function: `init-user-rows`

**Endpoint:** `POST /functions/v1/init-user-rows`

**Request:**
```json
{
  "user_id": "uuid"
}
```

**Behavior:**
- Upserts rows in `user_dashboard_stats` and `user_gamification`
- All values initialized to 0 (credits_zen to 10)
- Called after signup or onboarding

## Frontend Architecture

### Custom Hooks

**`useDashboardStats(userId)`**
- Fetches dashboard stats with realtime updates
- Always returns defaults (0) if no data
- Auto-invalidates on changes

**`useWeeklyMenu(userId)`**
- Fetches current week's menu
- Realtime subscription for auto-refresh
- Returns `{ menu, days, hasMenu, isLoading }`

### Pages

**`/app` - Dashboard**
- Displays KPIs (all default to 0)
- Shows weekly menu (7 cards)
- Generate/regenerate button
- Realtime updates via hooks

**`/app/recipes/:id` - Recipe Detail**
- Loads recipe from `public.recipes`
- Displays full details, ingredients, instructions
- Image with fallback to `/img/hero-default.png`

**`/app/meal-plan` - Weekly Table**
- Full week view with shopping list
- Currently static (to be connected)

### Server Actions

**`generateMenuForUser(weekStart?)`**
- Wrapper for edge function call
- Invalidates cache on success
- Returns structured result

**`generateMenuWithToast(weekStart?)`**
- Same as above + toast notification properties

## Image Handling

### Configuration
Images are served from Supabase Storage or public URLs.

### Usage in Components
```tsx
<img 
  src={imageUrl || '/img/hero-default.png'}
  alt={title}
  onError={(e) => {
    (e.target as HTMLImageElement).src = '/img/hero-default.png';
  }}
/>
```

### Fallback Chain
1. `image_url` from database (if absolute URL)
2. `image_path` from storage (construct full URL)
3. `/img/hero-default.png` (local fallback)

## Realtime Updates

### Subscription Setup
```typescript
const channel = supabase
  .channel('user-weekly-menu')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'user_weekly_menus',
      filter: `user_id=eq.${userId}`
    },
    (payload) => {
      // Invalidate query cache
      queryClient.invalidateQueries({ queryKey: ['weeklyMenu', userId] });
    }
  )
  .subscribe();
```

### Cleanup
```typescript
return () => {
  supabase.removeChannel(channel);
};
```

## Security

### Row-Level Security (RLS)
- All user tables have RLS enabled
- Policy: `auth.uid() = user_id`
- Service role bypasses RLS (server-side only)

### Storage
- Public bucket: images accessible to all
- Private bucket: signed URLs generated server-side (7-day validity)

### API Keys
- **Client-side:** anon key only
- **Server-side:** service role key (Edge Functions only)

## Performance

### Indexes
- `recipes(prep_min, total_min, calories, proteins)` - filter performance
- `recipes(tags) GIN`, `recipes(appliances) GIN` - array filters
- `recipes(ingredients_text) GIN TRGM` - text search (if pg_trgm enabled)
- `user_weekly_menus(user_id, week_start DESC)` - lookup speed

### Caching
- TanStack Query: 5-minute stale time
- Placeholder data for instant UI
- Realtime invalidation on updates

## Development

### Run Locally
```bash
npm install
npm run dev
```

### Generate Menu (cURL)
```bash
curl -X POST https://pghdaozgxkbtsxwydemd.supabase.co/functions/v1/generate-menu \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"week_start": "2025-01-20"}'
```

### Check Logs
```bash
# Edge function logs
supabase functions logs generate-menu

# Database logs
supabase db logs
```

## Acceptance Tests

### 1. Zero Initialization ✅
- New user → rows in stats/gamification with 0s
- Dashboard displays 0 for all KPIs

### 2. Menu Generation ✅
- Save preferences → triggers generate-menu
- Menu persists after navigation
- Realtime updates work

### 3. Filter Enforcement ✅
- Appliances: no airfryer recipes if not owned
- Exclusions: never appear
- Time/calories: applied when provided

### 4. Fallback Ladder ✅
- Generic profile still gets 7 meals
- Banner shows "filtres assouplis"

### 5. Images ✅
- Cards show recipe images
- Detail page renders correctly
- Fallback to default image on error

### 6. Routing ✅
- "Voir la recette" opens `/recipes/:id`
- Recipe detail loads from database

### 7. Realtime ✅
- Regenerate triggers auto-refresh
- No manual reload needed

### 8. Security ✅
- RLS on all user tables
- Service role only on server
- No secrets exposed to client

## Labels & Translations

All labels are in French (fr-FR):
- Days: Lundi, Mardi, Mercredi, Jeudi, Vendredi, Samedi, Dimanche
- UI: "Générer ma semaine", "Voir la recette", "Régénérer"
- Toasts: "Menu généré !", "Erreur", etc.

## Troubleshooting

### Menu not appearing
1. Check console for errors
2. Verify user has preferences
3. Check if recipes exist in database
4. Review edge function logs

### Images not loading
1. Verify image_url or image_path exists
2. Check storage bucket permissions
3. Confirm fallback image exists at `/public/img/hero-default.png`

### Realtime not working
1. Check subscription setup in useEffect
2. Verify channel cleanup on unmount
3. Confirm RLS policies allow user to read own data

### Stats showing undefined
1. Ensure useDashboardStats returns defaults
2. Check database for user_dashboard_stats row
3. Verify migration ran successfully

## Next Steps

1. Connect MealPlan page to real data
2. Implement swap functionality (use-swap edge function)
3. Add meal validation (update stats)
4. Build shopping list generator
5. Add recipe rating system
6. Implement referral system
