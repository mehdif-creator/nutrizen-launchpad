# NutriZen - Coding Standards

## TypeScript Guidelines

### Strict Mode
All TypeScript must compile with `strict: true` enabled. No `any` types allowed except with justified `// eslint-disable-next-line` comments.

### Type Definitions

**DO:**
```typescript
interface User {
  id: string;
  email: string;
  name: string | null;
}

function fetchUser(userId: string): Promise<User> {
  // ...
}
```

**DON'T:**
```typescript
function fetchUser(userId: any): Promise<any> {
  // ...
}
```

### Null Checks

Always handle null/undefined explicitly:

```typescript
// DO
const userName = user?.name ?? 'Anonymous';
const stats = data ?? DEFAULT_STATS;

// DON'T
const userName = user.name; // Can crash if user is null
const stats = data || DEFAULT_STATS; // Treats 0 as falsy
```

### Type Imports

Use type-only imports when importing types:

```typescript
import type { User } from './types';
import { fetchUser } from './api';
```

## React Patterns

### Component Structure

```typescript
import { useState, useEffect } from 'react';
import type { ComponentProps } from 'react';

interface MyComponentProps {
  title: string;
  onAction?: () => void;
}

export const MyComponent = ({ title, onAction }: MyComponentProps) => {
  const [state, setState] = useState<string>('');

  useEffect(() => {
    // Effect logic
    return () => {
      // Cleanup
    };
  }, []);

  return (
    <div>
      {/* JSX */}
    </div>
  );
};
```

### Naming Conventions

- **Components**: PascalCase (e.g., `MealCard`, `StatCard`)
- **Hooks**: camelCase with `use` prefix (e.g., `useAuth`, `useDashboardStats`)
- **Utils**: camelCase (e.g., `formatDate`, `calculateLevel`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `DEFAULT_STATS`, `API_BASE_URL`)
- **Files**: Match export name (e.g., `MealCard.tsx`, `useAuth.ts`)

### Custom Hooks

Always start with `use` and return consistent interface:

```typescript
export function useDashboardStats(userId: string | undefined) {
  const query = useQuery({
    queryKey: ['dashboardStats', userId],
    queryFn: () => fetchDashboardStats(userId!),
    enabled: !!userId,
  });

  return {
    stats: query.data ?? DEFAULT_STATS,
    isLoading: query.isLoading,
    error: query.error,
  };
}
```

### Event Handlers

Prefix with `handle` and be specific:

```typescript
const handleSubmit = async (e: FormEvent) => {
  e.preventDefault();
  // ...
};

const handleMenuRegenerate = async () => {
  // ...
};
```

## Styling Guidelines

### Tailwind CSS

Use semantic tokens from `index.css` and `tailwind.config.ts`:

**DO:**
```tsx
<div className="bg-background text-foreground border-border">
  <h1 className="text-primary">Title</h1>
</div>
```

**DON'T:**
```tsx
<div className="bg-white text-black border-gray-300">
  <h1 className="text-blue-500">Title</h1>
</div>
```

### Component Variants

Use `class-variance-authority` for component variants:

```typescript
import { cva } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground',
        destructive: 'bg-destructive text-destructive-foreground',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);
```

## Data Fetching

### TanStack Query

```typescript
import { useQuery } from '@tanstack/react-query';

function useWeeklyMenu(userId: string | undefined) {
  return useQuery({
    queryKey: ['weeklyMenu', userId],
    queryFn: () => fetchWeeklyMenu(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: null, // or default value
  });
}
```

### Supabase Client

Always use typed client:

```typescript
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

const { data, error } = await supabase
  .from('user_weekly_menus')
  .select('*')
  .eq('user_id', userId)
  .maybeSingle();

if (error) {
  console.error('Error fetching menu:', error);
  throw error;
}
```

### Error Handling

```typescript
try {
  const result = await fetchData();
  return result;
} catch (error) {
  console.error('[Context] Error message:', error);
  throw error; // Re-throw for caller to handle
}
```

## Edge Functions

### Structure

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation schema
const InputSchema = z.object({
  field: z.string(),
}).strict();

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Setup Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error("Invalid token");
    }

    // Validate input
    const body = await req.json().catch(() => ({}));
    const validatedInput = InputSchema.parse(body);

    // Business logic
    console.log(`[function-name] Processing for user: ${user.id}`);
    
    // Return response
    return new Response(
      JSON.stringify({ success: true, data: {} }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[function-name] Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { 
        status: error instanceof z.ZodError ? 400 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
```

### Logging

Use structured logging with context:

```typescript
console.log(`[function-name] Action: value`);
console.error(`[function-name] Error:`, error);
console.info(`[function-name] User ${userId} action completed`);
```

**Never log sensitive data**: passwords, tokens, full user objects.

## Testing

### Unit Tests (Future)

```typescript
import { describe, it, expect } from 'vitest';
import { calculateLevel } from './utils';

describe('calculateLevel', () => {
  it('should return Bronze for < 50 points', () => {
    expect(calculateLevel(30)).toBe('Bronze');
  });

  it('should return Silver for 50-149 points', () => {
    expect(calculateLevel(100)).toBe('Silver');
  });
});
```

### Integration Tests (Future)

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { Dashboard } from './Dashboard';

describe('Dashboard', () => {
  it('should display weekly menu', async () => {
    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText('Lundi')).toBeInTheDocument();
    });
  });
});
```

## Git Commit Messages

Follow conventional commits:

```
feat: add meal swap functionality
fix: resolve null stats display issue
docs: update architecture diagram
refactor: extract menu generation logic
test: add tests for useDashboardStats hook
chore: update dependencies
```

## Code Review Checklist

Before submitting PR:

- [ ] Code compiles with no TypeScript errors
- [ ] ESLint passes with no warnings
- [ ] Prettier formatted
- [ ] No `console.log` (use console.info/warn/error)
- [ ] No hardcoded values (use constants/env vars)
- [ ] Error handling present
- [ ] Null/undefined checks
- [ ] Loading states handled
- [ ] Accessibility attributes (aria-*)
- [ ] Responsive design (mobile-first)
- [ ] Internationalization (French labels)

## Anti-Patterns to Avoid

### ❌ Mutating State Directly

```typescript
// DON'T
const items = [...];
items[0].name = 'new name';
setItems(items);

// DO
setItems(items.map((item, i) => 
  i === 0 ? { ...item, name: 'new name' } : item
));
```

### ❌ Ignoring Errors

```typescript
// DON'T
try {
  await fetchData();
} catch (e) {
  // Silent failure
}

// DO
try {
  await fetchData();
} catch (error) {
  console.error('Error fetching data:', error);
  throw error; // or handle appropriately
}
```

### ❌ Prop Drilling

```typescript
// DON'T
<Parent userId={userId}>
  <Child userId={userId}>
    <GrandChild userId={userId} />
  </Child>
</Parent>

// DO (use Context or pass via composition)
<AuthProvider>
  <Parent>
    <Child>
      <GrandChild />
    </Child>
  </Parent>
</AuthProvider>
```

### ❌ Large Components

Break down components > 200 lines into smaller, focused components.

### ❌ Inline Functions in JSX

```typescript
// DON'T (creates new function on every render)
<button onClick={() => handleClick(id)}>

// DO
const handleButtonClick = () => handleClick(id);
<button onClick={handleButtonClick}>
```

## Performance Guidelines

1. **Memoization**: Use `useMemo` and `useCallback` for expensive computations
2. **Virtualization**: Use virtual lists for large datasets (react-window)
3. **Lazy Loading**: Code split with `React.lazy` and `Suspense`
4. **Debouncing**: Use debounce for search inputs (lodash.debounce)
5. **Image Optimization**: Use proper sizes, lazy loading, WebP format

## Accessibility (a11y)

1. **Semantic HTML**: Use proper tags (`<button>`, `<nav>`, `<main>`)
2. **ARIA Labels**: Add `aria-label`, `aria-describedby` where needed
3. **Keyboard Navigation**: Ensure all interactive elements are keyboard accessible
4. **Focus Management**: Proper focus states, trap focus in modals
5. **Color Contrast**: Ensure WCAG AA compliance (4.5:1 ratio)

## Security Guidelines

1. **Never expose service role key** to client
2. **Validate all inputs** (use Zod schemas)
3. **Sanitize user content** (no dangerouslySetInnerHTML without DOMPurify)
4. **Use prepared statements** (Supabase client handles this)
5. **Implement RLS policies** on all user tables
6. **HTTPS only** in production
7. **Secrets in environment variables** (never commit)

## Documentation

### Inline Comments

Use JSDoc for functions:

```typescript
/**
 * Calculate user level based on total points
 * @param points - Total points earned
 * @returns Level string (Bronze, Silver, Gold, Platinum)
 */
export function calculateLevel(points: number): string {
  if (points < 50) return 'Bronze';
  if (points < 150) return 'Silver';
  if (points < 300) return 'Gold';
  return 'Platinum';
}
```

### README Updates

Update relevant docs when:
- Adding new features
- Changing API contracts
- Updating dependencies
- Modifying architecture

## Resources

- [React Best Practices](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [TanStack Query](https://tanstack.com/query/latest/docs/react/overview)
- [Supabase Docs](https://supabase.com/docs)
