# French Translation Fix - NutriZen

## Problem
- Incorrect French translations due to homonyms (e.g., "four" showing as "quatre" instead of "oven")
- Inconsistent terminology across the app
- App was not fully French by default
- No glossary to prevent translation errors

## Solutions Implemented

### 1. Domain Glossary (`src/i18n/fr-glossary.ts`)
Defines domain-specific terms to avoid homonym errors:

#### Key Homonyms Resolved:
- **four** (oven/appareil) ❌ NOT "quatre" (number 4)
- **range** (kitchen/cuisinière) ❌ NOT "plage" (time range) or "gamme" (product range)
- **servings** (portions) ❌ NOT "services"
- **plan** (context-specific):
  - Subscription plan → "formule d'abonnement"
  - Meal plan → "programme alimentaire / plan repas"

#### Categories in Glossary:
- Kitchen appliances (électroménager)
- Time & quantities (temps & quantités)
- Nutrition terms (termes nutritionnels)
- Subscription & billing (abonnement & facturation)
- Common UI actions (actions courantes)

### 2. Translation System (`src/i18n/translations.ts`)
- **Default locale: fr-FR**
- Type-safe translation keys
- Fallback to key if translation missing
- Helper function: `t(key, locale = 'fr')`

#### Key Translations:
```typescript
'appliance.oven': 'Four',  // ✅ Correct: oven appliance
'appliance.stove': 'Cuisinière',  // ✅ Correct: cooking range
'profile.activityLevel.sedentary': 'Sédentaire',
// etc.
```

### 3. Language Context Updates (`src/contexts/LanguageContext.tsx`)
- **Default language: French (fr)**
- Prevents auto-translate by LLMs
- Static i18n dictionaries only

### 4. Applied Translations
- ✅ Profile page field labels
- ✅ Post-checkout profile form
- ✅ Menu generation states
- ✅ Common UI elements (buttons, errors, loading)
- ✅ Appliance names (four, cuisinière, etc.)

## Usage Examples

### In Components:
```tsx
import { t } from '@/i18n/translations';

// Profile fields
<Label>{t('profile.activityLevel')}</Label>

// Appliances
<SelectItem value="four">{t('appliance.oven')}</SelectItem>

// Common UI
<Button>{t('common.save')}</Button>
```

### In Glossary:
```tsx
import { getGlossaryTerm, GLOSSARY_FR } from '@/i18n/fr-glossary';

// Get specific term
const ovenTerm = getGlossaryTerm('oven'); // "four"

// Direct access
const kitchenAppliances = GLOSSARY_FR.kitchen.appliances;
```

## Translation Checklist
- [x] All UI strings use t() function
- [x] Appliance names use correct terms
- [x] No hardcoded French strings (except in translation files)
- [x] Default locale set to fr-FR
- [x] Glossary documented for future additions
- [ ] Build-time translation validation (future)
- [ ] Native French speaker QA pass (recommended)

## Adding New Translations

1. **Check glossary first**: `src/i18n/fr-glossary.ts`
2. **Add to translations**: `src/i18n/translations.ts`
3. **Use in component**: `t('your.key')`
4. **Document homonyms**: If ambiguous, add to glossary

## Common Mistakes to Avoid

❌ **DON'T:**
```tsx
<span>four</span>  // Ambiguous!
<span>4</span>  // OK for numbers
```

✅ **DO:**
```tsx
<span>{t('appliance.oven')}</span>  // Clear: it's the appliance
<span>4</span>  // Numbers stay as numbers
```

## Testing
- [ ] All labels in French
- [ ] "Four" appears as oven appliance, never as "quatre"
- [ ] Consistent terminology across profile, menu, settings
- [ ] No EN fallbacks in production
- [ ] Mobile viewport labels readable

## Future Enhancements
1. Build-time translation validation (eslint-plugin-i18next)
2. Missing key detection
3. Unit snapshot tests for key screens
4. Multi-language support (en, es, de) using same system
