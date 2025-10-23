# Frontend Integration Guide

## Overview

This guide explains how to integrate the NutriZen backend with your React/Next.js frontend using Lovable.

---

## 1. Onboarding Flow

### After User Completes Onboarding

```typescript
// src/pages/Onboarding.tsx or similar

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const handleOnboardingComplete = async (preferences: any) => {
  const { user } = useAuth();
  
  try {
    // 1. Save preferences to DB
    const { error: prefError } = await supabase
      .from('preferences')
      .upsert({
        user_id: user.id,
        ...preferences
      });
    
    if (prefError) throw prefError;
    
    // 2. Initialize user stats/gamification (if not already done by trigger)
    await supabase.functions.invoke('init-user-rows', {
      body: { user_id: user.id }
    });
    
    // 3. Generate initial weekly menu
    const { data: menuData, error: menuError } = await supabase.functions.invoke('generate-menu', {
      body: {} // Uses current user from JWT
    });
    
    if (menuError) throw menuError;
    
    // 4. Redirect to dashboard
    router.push('/app/dashboard');
    
  } catch (error) {
    console.error('Onboarding completion error:', error);
    toast.error('Failed to complete onboarding. Please try again.');
  }
};
```

---

## 2. Dashboard Implementation

### Load User Data

```typescript
// src/pages/app/Dashboard.tsx

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [gamification, setGamification] = useState(null);
  const [weekMeals, setWeekMeals] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const loadDashboardData = async () => {
      try {
        // Load dashboard stats
        const { data: statsData } = await supabase
          .from('user_dashboard_stats')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        
        // Coalesce to defaults if not found
        setStats(statsData || {
          temps_gagne: 0,
          charge_mentale_pct: 0,
          serie_en_cours_set_count: 0,
          credits_zen: 10,
          references_count: 0,
          objectif_hebdos_valide: 0
        });

        // Load gamification
        const { data: gamifData } = await supabase
          .from('user_gamification')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        
        setGamification(gamifData || {
          points: 0,
          level: 1,
          streak_days: 0,
          badges_count: 0
        });

        // Load latest weekly menu
        const { data: menuData } = await supabase
          .from('user_weekly_menus')
          .select('*')
          .eq('user_id', user.id)
          .order('week_start', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (menuData?.payload?.days) {
          setWeekMeals(menuData.payload.days);
        }

      } catch (error) {
        console.error('Dashboard load error:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [user]);

  // ... rest of component
}
```

### Real-time Menu Updates

```typescript
// Add to Dashboard component

useEffect(() => {
  if (!user) return;

  // Subscribe to menu changes
  const channel = supabase
    .channel('user_menus_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'user_weekly_menus',
        filter: `user_id=eq.${user.id}`
      },
      (payload) => {
        console.log('Menu updated:', payload);
        if (payload.new?.payload?.days) {
          setWeekMeals(payload.new.payload.days);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [user]);
```

### Generate Menu Button

```typescript
const handleGenerateMenu = async () => {
  setGenerating(true);
  try {
    const { data, error } = await supabase.functions.invoke('generate-menu', {
      body: {} // Uses current user from JWT
    });

    if (error) throw error;

    if (data.usedFallback) {
      toast.info('Menu généré avec critères assouplis (allergies respectées)');
    } else {
      toast.success('Menu généré avec succès !');
    }

    // Menu will auto-update via realtime subscription
  } catch (error) {
    console.error('Menu generation error:', error);
    toast.error('Échec de la génération du menu');
  } finally {
    setGenerating(false);
  }
};

// In JSX
<Button onClick={handleGenerateMenu} disabled={generating}>
  {generating ? 'Génération...' : 'Régénérer la semaine'}
</Button>
```

---

## 3. Preferences Updates

### Trigger Menu Regeneration After Saving Preferences

```typescript
// src/pages/app/Settings.tsx or Preferences page

const handleSavePreferences = async (formData: any) => {
  try {
    // 1. Save preferences
    const { error: saveError } = await supabase
      .from('preferences')
      .update(formData)
      .eq('user_id', user.id);
    
    if (saveError) throw saveError;

    toast.success('Préférences enregistrées');

    // 2. Ask user if they want to regenerate menu
    const shouldRegenerate = await confirm(
      'Voulez-vous régénérer votre menu avec les nouveaux critères ?'
    );

    if (shouldRegenerate) {
      // 3. Regenerate menu
      const { error: menuError } = await supabase.functions.invoke('generate-menu', {
        body: {}
      });

      if (menuError) throw menuError;
      
      toast.success('Menu régénéré !');
      router.push('/app/dashboard');
    }

  } catch (error) {
    console.error('Save preferences error:', error);
    toast.error('Échec de l\'enregistrement');
  }
};
```

---

## 4. Recipe Detail Page

### Route Configuration

```typescript
// src/App.tsx or routes configuration

<Route path="/app/recipes/:id" element={<RecipeDetail />} />
```

### RecipeDetail Component

```typescript
// src/pages/app/RecipeDetail.tsx

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export default function RecipeDetail() {
  const { id } = useParams<{ id: string }>();
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRecipe = async () => {
      try {
        const { data, error } = await supabase
          .from('recipes')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        setRecipe(data);
      } catch (error) {
        console.error('Recipe load error:', error);
        toast.error('Recette introuvable');
      } finally {
        setLoading(false);
      }
    };

    if (id) loadRecipe();
  }, [id]);

  if (loading) return <div>Chargement...</div>;
  if (!recipe) return <div>Recette introuvable</div>;

  return (
    <div>
      <h1>{recipe.title}</h1>
      <img src={recipe.image_url || recipe.image_path} alt={recipe.title} />
      <div>
        <p>Temps de préparation: {recipe.prep_time_min} min</p>
        <p>Temps total: {recipe.total_time_min} min</p>
        <p>Calories: {recipe.calories_kcal} kcal</p>
      </div>
      {/* Render ingredients, instructions, etc. */}
    </div>
  );
}
```

### MealCard Component (Link to Recipe)

```typescript
// src/components/app/MealCard.tsx

import { Link } from 'react-router-dom';

interface MealCardProps {
  day: string;
  title: string;
  recipeId: string;
  imageUrl?: string;
  prepMin: number;
  totalMin: number;
  calories: number;
}

export function MealCard({ 
  day, 
  title, 
  recipeId, 
  imageUrl, 
  prepMin, 
  totalMin, 
  calories 
}: MealCardProps) {
  return (
    <div className="meal-card">
      <img 
        src={imageUrl || '/img/recipe-default.jpg'} 
        alt={title} 
      />
      <h3>{day}</h3>
      <p>{title}</p>
      <div className="stats">
        <span>{prepMin} min</span>
        <span>{calories} kcal</span>
      </div>
      <Link to={`/app/recipes/${recipeId}`}>
        <Button>Voir la recette</Button>
      </Link>
    </div>
  );
}
```

---

## 5. Image Handling

### Next.js Configuration

```javascript
// next.config.js

module.exports = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'pghdaozgxkbtsxwydemd.supabase.co',
      }
    ],
  },
};
```

### Using Next/Image

```typescript
import Image from 'next/image';

<Image
  src={imageUrl || '/img/recipe-default.jpg'}
  alt={title}
  width={300}
  height={200}
  className="recipe-image"
/>
```

### Handling Signed URLs

```typescript
// If using private bucket, images will come with signed URLs from edge function
const menuData = {
  days: [
    {
      day: "Lundi",
      recipe_id: "...",
      title: "...",
      image_url: "https://...signed URL...", // Already signed by edge function
      ...
    }
  ]
};

// Just use image_url directly - it's already signed for 7 days
```

---

## 6. Error Handling

### Global Error Boundary

```typescript
// src/components/ErrorBoundary.tsx

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-page">
          <h1>Oups ! Une erreur s'est produite</h1>
          <button onClick={() => window.location.reload()}>
            Recharger la page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### Edge Function Error Handling

```typescript
const callEdgeFunction = async () => {
  try {
    const { data, error } = await supabase.functions.invoke('generate-menu');
    
    if (error) {
      // Check error status
      if (error.message?.includes('429')) {
        toast.error('Trop de requêtes. Veuillez patienter.');
      } else if (error.message?.includes('401')) {
        toast.error('Session expirée. Veuillez vous reconnecter.');
        router.push('/auth/login');
      } else {
        toast.error('Une erreur est survenue. Veuillez réessayer.');
      }
      return;
    }

    return data;
  } catch (error) {
    console.error('Edge function error:', error);
    toast.error('Erreur de connexion au serveur.');
  }
};
```

---

## 7. Loading States

### Skeleton Loaders

```typescript
// src/components/app/MealCardSkeleton.tsx

export function MealCardSkeleton() {
  return (
    <div className="meal-card skeleton">
      <div className="skeleton-image" />
      <div className="skeleton-title" />
      <div className="skeleton-stats" />
      <div className="skeleton-button" />
    </div>
  );
}

// Usage in Dashboard
{loading ? (
  <>
    {[...Array(7)].map((_, i) => <MealCardSkeleton key={i} />)}
  </>
) : (
  weekMeals?.map(meal => <MealCard key={meal.day} {...meal} />)
)}
```

---

## 8. Performance Optimizations

### Memoization

```typescript
import { useMemo } from 'react';

const Dashboard = () => {
  const mealCards = useMemo(() => {
    return weekMeals?.map(meal => (
      <MealCard key={meal.day} {...meal} />
    ));
  }, [weekMeals]);

  return <div>{mealCards}</div>;
};
```

### Lazy Loading

```typescript
import { lazy, Suspense } from 'react';

const RecipeDetail = lazy(() => import('./pages/app/RecipeDetail'));

<Suspense fallback={<LoadingSpinner />}>
  <RecipeDetail />
</Suspense>
```

---

## 9. Testing

### Manual Testing Checklist

- [ ] New user sees all zeros on dashboard
- [ ] Menu generates after onboarding
- [ ] Menu persists after navigation
- [ ] "Voir la recette" opens correct recipe
- [ ] Images load correctly
- [ ] Realtime updates work
- [ ] Preferences save triggers menu regen option
- [ ] Error states display correctly
- [ ] Loading states display correctly

---

## 10. Common Issues & Solutions

### Issue: Images don't load

**Solution:**
1. Check `next.config.js` has correct `remotePatterns`
2. Verify `image_url` or `image_path` exists in recipe data
3. Check browser console for CORS errors
4. If using private bucket, ensure signed URLs are generated

### Issue: Menu doesn't persist

**Solution:**
1. Verify data is saved to `user_weekly_menus` table (check DB)
2. Check RLS policies allow user to read own menus
3. Ensure realtime subscription is set up correctly

### Issue: Realtime updates don't work

**Solution:**
1. Check realtime is enabled in Supabase dashboard
2. Verify filter: `filter: \`user_id=eq.${user.id}\``
3. Check channel subscription is active
4. Look for errors in console

### Issue: Edge function fails with 401

**Solution:**
1. Check JWT token is being sent in Authorization header
2. Verify token hasn't expired
3. Ensure user is authenticated

---

## Summary

The frontend integration requires:

1. **Onboarding:** Save preferences → init user stats → generate menu → redirect to dashboard
2. **Dashboard:** Load stats (coalesce to 0) → load menu → subscribe to realtime updates
3. **Preferences:** Save → offer to regenerate menu
4. **Recipe Detail:** Route `/app/recipes/:id` → fetch recipe → display
5. **Images:** Configure Next.js → use image_url or signed URLs
6. **Error Handling:** Graceful degradation + user-friendly messages
7. **Performance:** Memoization + lazy loading + skeleton loaders

All done! 🚀
