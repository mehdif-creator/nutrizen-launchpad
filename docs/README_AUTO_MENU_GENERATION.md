# Automatic Menu Generation After Profile Completion - NutriZen

## Problem
- After post-purchase profile completion, weekly menu was NOT auto-generated
- Popup claimed it would generate, but nothing happened
- No reliable, idempotent path for menu generation

## Solutions Implemented

### 1. Database Trigger (`migration: generate_initial_menu_for_user`)
Automatically marks when a user needs menu generation:

```sql
CREATE FUNCTION public.generate_initial_menu_for_user()
```

**Features:**
- ✅ Idempotent: Only triggers if no menu exists for current week
- ✅ Doesn't block: Logs event instead of running long generation
- ✅ Smart: Only triggers on meaningful profile updates
- ✅ Week-aware: Uses Monday as week start (Europe/Paris timezone)

**Trigger fires on:**
- New profile creation (INSERT)
- Meaningful updates (objectif_principal, type_alimentation changes)

### 2. Unique Constraint
Ensures one menu per user per week:

```sql
ALTER TABLE user_weekly_menus
ADD CONSTRAINT unique_user_week_menu 
UNIQUE (user_id, week_start);
```

### 3. Post-Checkout Flow (`src/pages/PostCheckoutProfile.tsx`)

**New user flow:**
1. User completes purchase → PostCheckout page
2. Authenticated? → Redirect to PostCheckoutProfile
3. User fills essential profile fields:
   - Age, sexe (required)
   - Niveau d'activité
   - Objectif principal (required)
   - Type d'alimentation
   - Temps de préparation
4. On submit:
   - Save preferences to DB
   - Trigger menu generation via edge function
   - Show loading state with proper messaging
   - Redirect to meal plan page

**States:**
- `profile`: Initial form
- `generating`: Loading with "Génération de ton menu..." message
- `complete`: Success with checkmark, auto-redirect

### 4. Menu Generation Hook (`src/hooks/useMenuGeneration.ts`)
Reusable hook for menu generation:

```tsx
const { generating, generateMenu } = useMenuGeneration();

// Call anywhere
const success = await generateMenu();
```

**Features:**
- ✅ Idempotent: Safe to call multiple times
- ✅ Error handling: User-friendly toasts
- ✅ Loading states: `generating` boolean
- ✅ Auth-aware: Uses session token

### 5. Edge Function Integration
Calls existing `generate-menu` edge function:

```typescript
const { error } = await supabase.functions.invoke('generate-menu', {
  headers: {
    Authorization: `Bearer ${session.access_token}`,
  },
});
```

**Edge function handles:**
- Recipe selection based on preferences
- Macro calculations
- Fallback strategies (F0-F4)
- Credit deduction (7 credits per week)
- Menu persistence

### 6. Index and Performance
```sql
CREATE INDEX idx_user_weekly_menus_user_week 
ON user_weekly_menus(user_id, week_start);
```

Fast lookups for duplicate prevention.

## User Flow Diagram

```
Purchase Complete
       ↓
PostCheckout Page
       ↓
   Authenticated?
    ↙         ↘
  Yes          No
   ↓            ↓
PostCheckout  Login
Profile       (magic link)
   ↓            ↓
Fill Profile  Return
   ↓            ↓
Save Prefs    PostCheckout
   ↓         Profile
Trigger Menu    ↓
Generation   Fill Profile
   ↓            ...
"Generating..."
   ↓
Menu Created
   ↓
Redirect to
/app/meal-plan
   ↓
View Week Menu ✅
```

## Technical Details

### Profile Completion Trigger
```typescript
// In preferences trigger
IF (no menu exists for current week) THEN
  INSERT INTO user_events (
    user_id,
    event_type: 'PROFILE_COMPLETED',
    meta: {
      week_start,
      trigger: 'profile_completion',
      needs_menu: true
    }
  );
END IF;
```

### Idempotency Guarantee
```sql
SELECT menu_id FROM user_weekly_menus
WHERE user_id = :user_id 
  AND week_start = :week_start
LIMIT 1;

-- Only proceed if NULL
```

### Error Handling
```typescript
try {
  // Save preferences
  // Generate menu
  setStep('complete');
  setTimeout(() => navigate('/app/meal-plan'), 2000);
} catch (error) {
  toast({
    title: t('error.generic'),
    description: 'Une erreur est survenue. Réessaye...',
    variant: 'destructive',
  });
  setStep('profile'); // Back to form for retry
}
```

## Testing Checklist

### Happy Path
- [ ] New user completes purchase
- [ ] Redirected to profile completion
- [ ] Fills required fields (age, sexe, objectif)
- [ ] Submits form
- [ ] Sees "Génération de ton menu..." loading state
- [ ] Menu appears in database (user_weekly_menus)
- [ ] Redirected to /app/meal-plan
- [ ] Current week menu is displayed

### Edge Cases
- [ ] **Duplicate prevention**: Submit form twice → Only one menu created
- [ ] **Existing menu**: User with menu updates profile → No duplicate
- [ ] **Retry on error**: Network fails → User can retry without issues
- [ ] **Session expired**: Auth check → Redirect to login
- [ ] **Incomplete form**: Required fields empty → Validation error

### Database
- [ ] `user_weekly_menus` unique constraint works
- [ ] Trigger only fires on meaningful updates
- [ ] Index improves lookup performance
- [ ] `user_events` logs PROFILE_COMPLETED

### UX
- [ ] Loading states are clear (français)
- [ ] Success message appears
- [ ] Error messages are actionable
- [ ] Redirect timing feels natural (2s)

## Observability

### Logs to Check
```typescript
console.log('[useMenuGeneration] Menu generated:', data);
console.error('[useMenuGeneration] Error:', error);
```

### Database Events
```sql
SELECT * FROM user_events
WHERE event_type = 'PROFILE_COMPLETED'
ORDER BY occurred_at DESC;
```

### Menu Verification
```sql
SELECT 
  user_id,
  week_start,
  created_at,
  jsonb_array_length(payload->'days') as day_count
FROM user_weekly_menus
ORDER BY created_at DESC
LIMIT 10;
```

## Future Enhancements
1. **Batch generation**: Generate multiple weeks at once
2. **Background jobs**: Queue menu generation for heavy load
3. **Retry logic**: Automatic retries on failure
4. **Email notification**: "Your menu is ready!"
5. **Analytics**: Track generation success rate
