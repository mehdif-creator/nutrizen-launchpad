# NutriZen - Architecture & Design

## Overview

NutriZen is a meal planning application built with modern web technologies, focusing on personalized weekly menu generation based on user preferences, dietary restrictions, and available kitchen appliances.

## Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 5
- **Routing**: React Router 6 (DOM)
- **State Management**: 
  - TanStack Query v5 (server state + caching)
  - React Context (auth state)
- **Styling**: 
  - Tailwind CSS 3.4
  - shadcn/ui components
  - CSS variables for theming
- **Forms**: React Hook Form + Zod validation
- **Date Handling**: date-fns (fr-FR locale, Europe/Paris timezone)

### Backend (Supabase)
- **Database**: PostgreSQL with Row-Level Security (RLS)
- **Edge Functions**: Deno runtime with TypeScript
- **Storage**: Supabase Storage for recipe images
- **Realtime**: WebSocket subscriptions for live updates
- **Auth**: JWT-based authentication

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  React App (Vite)                                      │ │
│  │  ├─ Pages: Dashboard, Profile, Recipes, Auth          │ │
│  │  ├─ Components: UI, App-specific, Landing            │ │
│  │  ├─ Hooks: useDashboardStats, useWeeklyMenu          │ │
│  │  ├─ Actions: generateMenu, initUser                  │ │
│  │  └─ Supabase Client (anon key)                       │ │
│  └────────────────────────────────────────────────────────┘ │
│                          ↓ HTTPS/WSS                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    SUPABASE (Backend)                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  API Gateway (JWT validation)                          │ │
│  └────────────────────────────────────────────────────────┘ │
│                            ↓                                 │
│  ┌──────────────────┬──────────────────┬──────────────────┐ │
│  │  Edge Functions  │   PostgreSQL     │  Realtime        │ │
│  │  (service role)  │   (RLS enabled)  │  (pub/sub)       │ │
│  │                  │                  │                  │ │
│  │  • generate-menu │  Tables:         │  Channels:       │ │
│  │  • init-user     │  • preferences   │  • user-menu     │ │
│  │  • use-swap      │  • recipes       │  • user-stats    │ │
│  │  • analyze-*     │  • menus         │  • gamification  │ │
│  │  • handle-ref    │  • stats         │                  │ │
│  └──────────────────┴──────────────────┴──────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Menu Generation Flow

```
User saves preferences
    ↓
Frontend calls generateMenuForUser() action
    ↓
Action calls Edge Function (generate-menu) with auth token
    ↓
Edge Function:
  1. Validates JWT → extracts user_id
  2. Loads user preferences from DB
  3. Queries recipes table with filters:
     - ALWAYS enforced: allergens, excluded_ingredients, appliances
     - Optional: time limits, calories, proteins, diet_tags, cuisines
  4. Applies fallback ladder if insufficient recipes:
     F0: Strict (all filters)
     F1: Widen time (+10 prep, +15 total)
     F2: Ignore diet_tags
     F3: Ignore cuisines/courses
     F4: Safe pool (common tags)
  5. Selects 7 distinct recipes (Mon-Sun)
  6. Signs image URLs if private bucket
  7. Upserts into user_weekly_menus (user_id, week_start)
    ↓
Edge Function returns { success, menu_id, days, usedFallback }
    ↓
Frontend action invalidates TanStack Query cache
    ↓
Dashboard auto-refreshes via useWeeklyMenu hook
    ↓
Realtime subscription ensures consistency across tabs
```

### 2. Dashboard KPI Flow

```
Dashboard mounts
    ↓
useAuth() provides user_id
    ↓
useDashboardStats(user_id) hook:
  - Queries user_dashboard_stats table (RLS: user_id = auth.uid())
  - Returns defaults if no row exists (all 0, credits_zen = 10)
  - Subscribes to Realtime updates (subscribeToUserStats)
    ↓
useWeeklyMenu(user_id) hook:
  - Queries user_weekly_menus for current week
  - Subscribes to Realtime updates (subscribeToUserMenu)
    ↓
Dashboard renders:
  - KPI cards (coalesced to 0, never null)
  - Menu cards (from DB payload.days)
  - CTA buttons (generate, swap, validate)
    ↓
On any DB change (e.g., menu regeneration):
  - Realtime event fires
  - Query cache invalidated
  - UI auto-updates (no manual reload)
```

## Database Schema

### Core Tables

#### `preferences`
Stores user dietary preferences and constraints.
```sql
CREATE TABLE public.preferences (
  user_id uuid PRIMARY KEY,
  diet_tags text[] NULL,           -- e.g., ['vegetarian', 'low-carb']
  cuisines text[] NULL,             -- e.g., ['french', 'italian']
  courses text[] NULL,              -- e.g., ['lunch', 'dinner']
  max_prep_min int NULL,            -- Max preparation time
  max_total_min int NULL,           -- Max total cooking time
  cal_min int NULL,                 -- Min calories per meal
  cal_max int NULL,                 -- Max calories per meal
  min_proteins_g int NULL,          -- Min protein per meal
  excluded_ingredients text[] DEFAULT '{}', -- ALWAYS enforced
  appliances_owned text[] DEFAULT '{}',     -- ALWAYS enforced
  -- ... other preference fields
);
```

#### `recipes`
Recipe catalog with nutritional and metadata.
```sql
CREATE TABLE public.recipes (
  id uuid PRIMARY KEY,
  title text NOT NULL,
  prep_min int,
  total_min int,
  calories int,
  proteins numeric,
  tags text[] DEFAULT '{}',         -- e.g., ['quick', 'vegetarian']
  appliances text[] DEFAULT '{}',   -- e.g., ['oven', 'airfryer']
  ingredients jsonb,                -- Structured ingredient list
  ingredients_text text,            -- Flattened for text search
  cuisine text,                     -- e.g., 'french'
  course text,                      -- e.g., 'dinner'
  image_url text,                   -- Public or signed URL
  image_path text,                  -- Storage path
  published boolean DEFAULT true,
  -- ... other recipe fields
);
```

#### `user_weekly_menus`
Persisted weekly menus (7 meals).
```sql
CREATE TABLE public.user_weekly_menus (
  menu_id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  week_start date NOT NULL,
  payload jsonb NOT NULL,           -- { days: [ { day, recipe_id, title, ... } ] }
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, week_start)
);
```

#### `user_dashboard_stats`
KPI tracking (all default to 0).
```sql
CREATE TABLE public.user_dashboard_stats (
  user_id uuid PRIMARY KEY,
  temps_gagne int DEFAULT 0 NOT NULL,
  charge_mentale_pct int DEFAULT 0 NOT NULL,
  serie_en_cours_set_count int DEFAULT 0 NOT NULL,
  credits_zen int DEFAULT 10 NOT NULL,
  references_count int DEFAULT 0 NOT NULL,
  objectif_hebdos_valide int DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now()
);
```

#### `user_gamification`
Gamification data (all default to 0).
```sql
CREATE TABLE public.user_gamification (
  user_id uuid PRIMARY KEY,
  points int DEFAULT 0 NOT NULL,
  level int DEFAULT 0 NOT NULL,
  streak_days int DEFAULT 0 NOT NULL,
  badges_count int DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now()
);
```

### Indexes (Performance)

```sql
-- Recipe filtering
CREATE INDEX idx_recipes_prep_min ON recipes(prep_min) WHERE published = true;
CREATE INDEX idx_recipes_total_min ON recipes(total_min) WHERE published = true;
CREATE INDEX idx_recipes_calories ON recipes(calories) WHERE published = true;
CREATE INDEX idx_recipes_proteins ON recipes(proteins) WHERE published = true;
CREATE INDEX idx_recipes_tags ON recipes USING GIN(tags);
CREATE INDEX idx_recipes_appliances ON recipes USING GIN(appliances);
CREATE INDEX idx_recipes_ingredients_text ON recipes USING GIN(to_tsvector('french', ingredients_text));

-- User data lookup
CREATE INDEX idx_preferences_user_id ON preferences(user_id);
CREATE INDEX idx_user_weekly_menus_user_week ON user_weekly_menus(user_id, week_start DESC);
CREATE INDEX idx_user_weekly_menus_latest ON user_weekly_menus(user_id, created_at DESC);
```

## Security Model

### Row-Level Security (RLS)

All user-specific tables have RLS enabled with policies:

```sql
-- Example: user_weekly_menus
ALTER TABLE user_weekly_menus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own menus"
ON user_weekly_menus
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

### Client-Server Separation

| Environment | Key Type | Usage |
|-------------|----------|-------|
| **Client** (Browser) | `SUPABASE_ANON_KEY` | Read-only queries with RLS; public access |
| **Server** (Edge Functions) | `SUPABASE_SERVICE_ROLE_KEY` | Full database access; bypasses RLS |

**CRITICAL**: Never expose `SUPABASE_SERVICE_ROLE_KEY` to client code.

### Image Security

- **Public bucket**: `image_url` points to public URL (e.g., `/storage/v1/object/public/recipes/...`)
- **Private bucket**: Edge function generates signed URL (7-day validity), stores in `payload.days[].image_url`

## Edge Function Contracts

### `POST /functions/v1/generate-menu`

**Request:**
```json
{
  "week_start": "2025-01-20" // optional, defaults to current week
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
2. Build query with filters (NULL/empty = no constraint)
3. **ALWAYS enforce**: allergens, excluded_ingredients, appliances
4. Apply optional filters: time, calories, proteins, tags, cuisines
5. Fallback ladder if 0 candidates (never relax exclusions/appliances)
6. Select 7 distinct recipes
7. Upsert into `user_weekly_menus`

## Frontend Patterns

### Custom Hooks

- `useDashboardStats(userId)`: Fetches stats with defaults (0), subscribes to Realtime
- `useWeeklyMenu(userId)`: Fetches current week menu, subscribes to Realtime
- `useGamification(userId)`: Fetches gamification data with defaults (0)
- `useAuth()`: Provides user, isAdmin, subscription, loading, signIn, signOut

### Server Actions

Located in `src/actions/`:
- `generateMenuForUser(userId, weekStart?)`: Calls Edge function, invalidates cache
- `initUserRows(userId)`: Initializes stats/gamification rows with 0s

### Realtime Subscriptions

Located in `src/lib/realtime.ts`:
- `subscribeToUserMenu(userId, callback)`: Returns cleanup function
- `subscribeToUserStats(userId, callback)`: Returns cleanup function
- `subscribeToGamification(userId, callback)`: Returns cleanup function

### Image Handling

```tsx
import Image from 'next/image'; // Not applicable, using plain img
<img 
  src={imageUrl || '/img/hero-default.png'}
  alt={title}
  onError={(e) => {
    (e.target as HTMLImageElement).src = '/img/hero-default.png';
  }}
  className="w-full h-48 object-cover"
/>
```

## Code Organization

```
nutrizen/
├── src/
│   ├── actions/              # Server actions (Edge Function wrappers)
│   │   ├── generateMenu.ts
│   │   └── initUser.ts
│   ├── components/
│   │   ├── app/              # App-specific components
│   │   │   ├── AppHeader.tsx
│   │   │   ├── MealCard.tsx
│   │   │   └── StatCard.tsx
│   │   ├── common/           # Shared components
│   │   │   ├── EmptyState.tsx
│   │   │   └── Spinner.tsx
│   │   ├── landing/          # Landing page components
│   │   └── ui/               # shadcn/ui components
│   ├── contexts/
│   │   └── AuthContext.tsx   # Auth state
│   ├── hooks/                # Custom React hooks
│   │   ├── useDashboardStats.ts
│   │   └── useWeeklyMenu.ts
│   ├── integrations/
│   │   └── supabase/         # Auto-generated types
│   ├── lib/
│   │   ├── queryClient.ts    # TanStack Query setup
│   │   ├── realtime.ts       # Realtime subscriptions
│   │   └── utils.ts          # Utility functions
│   ├── pages/                # React Router pages
│   │   ├── app/              # Authenticated app pages
│   │   ├── auth/             # Auth pages (login, signup)
│   │   └── legal/            # Legal pages
│   └── main.tsx              # App entry point
├── supabase/
│   ├── functions/            # Edge Functions
│   │   ├── generate-menu/
│   │   ├── init-user-rows/
│   │   └── ...
│   ├── migrations/           # SQL migrations
│   └── config.toml           # Supabase config
├── public/
│   └── img/                  # Static images
├── docs/                     # Documentation
├── .env.example              # Environment variables template
├── tsconfig.json             # TypeScript config (strict)
├── eslint.config.js          # ESLint config
├── .prettierrc.json          # Prettier config
└── vite.config.ts            # Vite config
```

## Performance Considerations

1. **Database Indexes**: Ensure all filter columns are indexed (see schema)
2. **Query Caching**: TanStack Query caches for 5 minutes (staleTime)
3. **Realtime**: Only subscribe to necessary channels; cleanup on unmount
4. **Image Optimization**: Use lazy loading, proper sizing, fallbacks
5. **Bundle Size**: Code splitting, tree shaking via Vite
6. **Edge Functions**: Avoid N+1 queries; use batch operations

## Internationalization (i18n)

- **Locale**: `fr-FR` (French)
- **Timezone**: `Europe/Paris`
- **Day Labels**: Lundi, Mardi, Mercredi, Jeudi, Vendredi, Samedi, Dimanche
- **Date Formatting**: Uses `date-fns` with French locale

## Future Enhancements

- [ ] Swap functionality (swap meal for another recipe)
- [ ] Meal validation (mark meals as completed)
- [ ] Shopping list generation
- [ ] Referral system
- [ ] Recipe rating/feedback
- [ ] Nutrition tracking
- [ ] Batch cooking mode
- [ ] Social features

## Acceptance Criteria

✅ Zero initialization: New users have stats/gamification rows with 0s
✅ Preferences → Menus: Saving preferences generates persisted menu
✅ Filters honored: Exclusions/appliances always enforced
✅ Fallback works: Generic profiles get 7 meals with relaxed filters
✅ Images render: Cards and detail pages show images or fallbacks
✅ Routing correct: "Voir la recette" opens `/recipes/:id`
✅ Security: RLS enabled, anon on client, service role server-only
✅ Realtime: Menu updates auto-refresh dashboard
