# Mobile Dropdown Fix - NutriZen

## Problem
Mobile dropdowns (iOS Safari/Chrome and Android) were freezing the UI:
- No scroll after opening dropdown
- Unable to tap outside to close
- Body scroll-lock persisting after close
- Position: fixed + 100vh causing iOS viewport issues

## Solutions Implemented

### 1. Mobile-Optimized Select Component (`src/components/ui/mobile-select.tsx`)
- **Native `<select>` fallback for mobile** (<768px): Most reliable solution for mobile devices
- **Custom dropdown for desktop**: Better UX with search, icons, etc.
- **Automatic detection**: Uses `useIsMobile()` hook to determine which variant to show

### 2. CSS Fixes (`src/components/ui/select-content-fix.css`)
- Uses `dvh` (dynamic viewport height) instead of `vh` for iOS compatibility
- Prevents body scroll lock on mobile
- Proper z-index layering (9999)
- `overscroll-behavior: contain` to prevent rubber band effect
- Touch-friendly target sizes (44px minimum)
- iOS safe area support

### 3. Usage Example
```tsx
import { MobileSelect } from '@/components/ui/mobile-select';

<MobileSelect
  id="niveau_activite"
  value={value}
  onValueChange={setValue}
  placeholder="Sélectionne..."
  options={[
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
  ]}
/>
```

### 4. Accessibility Features
- Proper ARIA labels and roles
- Keyboard navigation support
- Focus management
- Android back button support (dismissible)

### 5. Where Applied
- ✅ Profile page: Activity level and job type selects
- ✅ Post-checkout profile: All dropdowns
- 🔄 Other pages: Can be migrated gradually by replacing `<Select>` with `<MobileSelect>`

## Testing Checklist
- [ ] iOS Safari (iPhone 12/13/14/15): Open/close dropdown, scroll after close
- [ ] Android Chrome: Open/close dropdown, back button closes dropdown
- [ ] iPad/Tablet: Verify desktop variant works correctly
- [ ] Rotation test: Portrait ↔ Landscape transitions
- [ ] Multiple dropdowns: Open one, verify others still work
- [ ] Backdrop tap: Tap outside dropdown to close

## Migration Guide
To migrate existing Select components:

1. Import the new component:
```tsx
import { MobileSelect } from '@/components/ui/mobile-select';
```

2. Convert options to array format:
```tsx
// Before
<Select value={value} onValueChange={setValue}>
  <SelectTrigger>
    <SelectValue placeholder="Select..." />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="opt1">Option 1</SelectItem>
    <SelectItem value="opt2">Option 2</SelectItem>
  </SelectContent>
</Select>

// After
<MobileSelect
  value={value}
  onValueChange={setValue}
  placeholder="Select..."
  options={[
    { value: 'opt1', label: 'Option 1' },
    { value: 'opt2', label: 'Option 2' },
  ]}
/>
```

## Performance
- Native select: Zero JS overhead on mobile
- Custom dropdown: Renders only when open
- No third-party dependencies
- Minimal bundle size impact (~2KB gzipped)
