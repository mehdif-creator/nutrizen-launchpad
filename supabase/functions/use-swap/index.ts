import { createClient } from '../_shared/deps.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { checkRateLimit, rateLimitExceededResponse } from '../_shared/rateLimit.ts';
import { getCorsHeaders } from '../_shared/security.ts';

// Allergen name -> canonical key mapping
const ALLERGEN_TO_KEY: Record<string, string> = {
  "Gluten": "gluten",
  "Lactose": "dairy",
  "Fruits à coque": "nuts",
  "Arachide": "peanuts",
  "Œufs": "eggs",
  "Fruits de mer": "shellfish",
  "Soja": "soy",
  "Sésame": "sesame",
  "Poisson": "fish",
  "Porc": "pork",
  "Bœuf": "beef",
};

// Diet type -> keys that must be excluded
const DIET_EXCLUSIONS: Record<string, string[]> = {
  'vegetarien': ['meat', 'pork', 'beef', 'fish', 'shellfish'],
  'végétarien': ['meat', 'pork', 'beef', 'fish', 'shellfish'],
  'vegetarian': ['meat', 'pork', 'beef', 'fish', 'shellfish'],
  'vegan': ['meat', 'pork', 'beef', 'fish', 'shellfish', 'dairy', 'eggs', 'honey'],
  'végétalien': ['meat', 'pork', 'beef', 'fish', 'shellfish', 'dairy', 'eggs', 'honey'],
  'pescatarien': ['meat', 'pork', 'beef'],
  'pescatarian': ['meat', 'pork', 'beef'],
  'halal': ['pork', 'alcohol'],
  'casher': ['pork', 'shellfish'],
  'kosher': ['pork', 'shellfish'],
};

const UseSwapSchema = z.object({
  recipe_id: z.string().uuid().optional(),
  meal_type: z.enum(['lunch', 'dinner']).optional(),
  meal_plan_id: z.string().uuid().optional(),
  day: z.number().int().min(0).max(6),
  request_id: z.string().uuid().optional(),
}).strict();

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── Rate limiting ─────────────────────────────────────────────────────────
    const rl = await checkRateLimit(supabaseClient, {
      identifier: `user:${user.id}`,
      endpoint:   'use-swap',
      maxTokens:  60,
      refillRate: 30,
      cost:       1,
    });
    if (!rl.allowed) return rateLimitExceededResponse(corsHeaders, rl.retryAfter);
    // ── End rate limiting ──────────────────────────────────────────────────────

    const body = await req.json()
    const validatedInput = UseSwapSchema.parse(body)

    // ── Idempotency check ─────────────────────────────────────────────────────
    const requestId = validatedInput.request_id;
    if (requestId) {
      const { data: existing } = await supabaseClient
        .from('credit_transactions')
        .select('id')
        .eq('idempotency_key', `swap:${requestId}`)
        .maybeSingle();
      
      if (existing) {
        console.log('[use-swap] Duplicate request_id detected, returning success without re-charging');
        return new Response(
          JSON.stringify({ success: true, error_code: 'DUPLICATE_REQUEST', creditsRemaining: null }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // ── Pre-check balance (read-only) — actual deduction AFTER successful swap ──
    console.log('[use-swap] Pre-checking credits for user:', user.id)
    const { data: walletPreCheck } = await supabaseClient
      .from('user_wallets')
      .select('subscription_credits, lifetime_credits')
      .eq('user_id', user.id)
      .maybeSingle();
    const preCheckBalance = (walletPreCheck?.subscription_credits ?? 0) + (walletPreCheck?.lifetime_credits ?? 0);

    if (preCheckBalance < 1) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error_code: 'INSUFFICIENT_CREDITS',
          error: 'Crédits insuffisants',
          current_balance: preCheckBalance,
          required: 1
        }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ============================================================
    // SAFETY GATE: Build user restriction keys (same as generate-menu)
    // ============================================================
    const { data: preferences } = await supabaseClient
      .from('preferences')
      .select('*')
      .eq('user_id', user.id)
      .single()

    let userRestrictionKeys: string[] = [];

    // 1. Structured allergies
    if (preferences?.allergies && Array.isArray(preferences.allergies)) {
      const allergyKeys = preferences.allergies
        .map((a: string) => ALLERGEN_TO_KEY[a] || a.toLowerCase().trim())
        .filter((k: string) => k.length > 0);
      userRestrictionKeys.push(...allergyKeys);
    }

    // 2. Aliments à éviter - map via dictionary
    if (preferences?.aliments_eviter && Array.isArray(preferences.aliments_eviter)) {
      const avoidItems = preferences.aliments_eviter
        .map((ing: string) => (ing || '').toLowerCase().trim())
        .filter((ing: string) => ing.length > 0);
      
      if (avoidItems.length > 0) {
        const { data: dictMatches } = await supabaseClient
          .from('restriction_dictionary')
          .select('key, pattern');
        
        if (dictMatches) {
          for (const item of avoidItems) {
            for (const entry of dictMatches) {
              if (item.includes(entry.pattern.toLowerCase()) || entry.pattern.toLowerCase().includes(item)) {
                userRestrictionKeys.push(entry.key);
              }
            }
            // Direct mapping for common terms
            if (item === 'porc' || item === 'cochon') userRestrictionKeys.push('pork');
          }
        }
      }
    }

    // 3. Free text allergies
    if (preferences?.autres_allergies) {
      const freeText = (preferences.autres_allergies || '').toLowerCase().trim();
      if (freeText.length > 0) {
        const { data: textMatches } = await supabaseClient
          .from('restriction_dictionary')
          .select('key, pattern');
        
        if (textMatches) {
          for (const match of textMatches) {
            if (freeText.includes(match.pattern.toLowerCase())) {
              userRestrictionKeys.push(match.key);
            }
          }
        }
      }
    }

    // 4. Diet type hard constraints
    if (preferences?.type_alimentation) {
      const dietKey = preferences.type_alimentation.toLowerCase().trim();
      const dietExclusions = DIET_EXCLUSIONS[dietKey];
      if (dietExclusions) {
        userRestrictionKeys.push(...dietExclusions);
        console.log(`[use-swap] Diet "${dietKey}" adds exclusions: ${dietExclusions.join(', ')}`);
      }
    }

    userRestrictionKeys = [...new Set(userRestrictionKeys)];
    console.log(`[use-swap] 🛡️ User restriction keys: [${userRestrictionKeys.join(', ')}]`);

    // ============================================================
    // Find current menu and get recipe IDs to exclude
    // ============================================================
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + diff);
    const weekStartStr = weekStart.toISOString().split('T')[0];

    const { data: menuData, error: menuError } = await supabaseClient
      .from('user_weekly_menus')
      .select('*')
      .eq('user_id', user.id)
      .eq('week_start', weekStartStr)
      .maybeSingle();

    // Get current recipe IDs to avoid duplicates
    const currentRecipeIds: string[] = [];
    if (menuData?.payload?.days) {
      for (const day of menuData.payload.days) {
        if (day.lunch?.recipe_id) currentRecipeIds.push(day.lunch.recipe_id);
        if (day.dinner?.recipe_id) currentRecipeIds.push(day.dinner.recipe_id);
        // Legacy format
        if (day.recipe_id) currentRecipeIds.push(day.recipe_id);
      }
    }

    // Also exclude the recipe being swapped
    if (validatedInput.recipe_id) {
      currentRecipeIds.push(validatedInput.recipe_id);
    }

    // ============================================================
    // Fetch SAFE candidate recipes using ingredient_keys
    // ============================================================
    let query = supabaseClient
      .from('recipes')
      .select('id, title, prep_time_min, total_time_min, calories_kcal, proteins_g, carbs_g, fats_g, image_url, image_path, ingredient_keys, base_servings, servings')
      .eq('published', true);

    // Exclude current recipes
    if (currentRecipeIds.length > 0) {
      query = query.not('id', 'in', `(${currentRecipeIds.join(',')})`);
    }

    const { data: candidates, error: recipesError } = await query.limit(100);

    if (recipesError || !candidates || candidates.length === 0) {
      console.error('[use-swap] No candidates found:', recipesError);
      return new Response(
        JSON.stringify({ success: false, error: 'Aucune recette de remplacement disponible' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // SAFETY FILTER: remove recipes that violate restrictions
    const safeRecipes = candidates.filter((recipe: any) => {
      const recipeKeys = recipe.ingredient_keys || [];
      const violations = userRestrictionKeys.filter(k => recipeKeys.includes(k));
      if (violations.length > 0) {
        console.log(`[use-swap] 🚫 BLOCKED: "${recipe.title}" - violates: [${violations.join(', ')}]`);
        return false;
      }
      return true;
    });

    console.log(`[use-swap] Safety filter: ${candidates.length} → ${safeRecipes.length} safe recipes`);

    if (safeRecipes.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Aucune recette de remplacement compatible avec tes restrictions alimentaires.',
          restrictions: userRestrictionKeys 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Pick a random safe recipe
    const randomRecipe = safeRecipes[Math.floor(Math.random() * safeRecipes.length)];

    // POST-VALIDATION: Double check the selected recipe
    const postCheckViolations = userRestrictionKeys.filter(k => 
      (randomRecipe.ingredient_keys || []).includes(k)
    );
    if (postCheckViolations.length > 0) {
      console.error(`[use-swap] 🚨 POST-VALIDATION FAILED for "${randomRecipe.title}": [${postCheckViolations.join(', ')}]`);
      return new Response(
        JSON.stringify({ success: false, error: 'Erreur de sécurité: recette non conforme détectée.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[use-swap] ✅ Selected safe recipe: "${randomRecipe.title}" (keys: [${(randomRecipe.ingredient_keys || []).join(', ')}])`);

    // Update menu payload if we have a menu
    if (menuData && validatedInput.day !== undefined) {
      const updatedDays = [...(menuData.payload?.days || [])];
      if (updatedDays[validatedInput.day]) {
        const mealType = validatedInput.meal_type || 'dinner';
        const baseServings = randomRecipe.base_servings || randomRecipe.servings || 2;
        
        // Get household info
        const { data: profileData } = await supabaseClient
          .from('profiles')
          .select('household_adults, household_children')
          .eq('id', user.id)
          .single();
        
        const adults = profileData?.household_adults ?? 1;
        const children = profileData?.household_children ?? 0;
        const effectiveSize = adults + children * 0.7;
        const roundedServings = Math.max(1, Math.round(effectiveSize));
        const portionFactor = roundedServings / baseServings;

        const mealEntry = {
          recipe_id: randomRecipe.id,
          title: randomRecipe.title,
          image_url: randomRecipe.image_url || randomRecipe.image_path || null,
          prep_min: randomRecipe.prep_time_min || 0,
          total_min: randomRecipe.total_time_min || 0,
          calories: Math.round((randomRecipe.calories_kcal || 0) * portionFactor),
          proteins_g: Math.round((randomRecipe.proteins_g || 0) * portionFactor),
          carbs_g: Math.round((randomRecipe.carbs_g || 0) * portionFactor),
          fats_g: Math.round((randomRecipe.fats_g || 0) * portionFactor),
          portion_factor: portionFactor,
          servings_used: roundedServings,
          base_servings: baseServings,
        };

        // Update the correct meal slot
        if (updatedDays[validatedInput.day].lunch && updatedDays[validatedInput.day].dinner) {
          updatedDays[validatedInput.day][mealType] = mealEntry;
        } else {
          // Legacy single-recipe format
          updatedDays[validatedInput.day] = mealEntry;
        }

        const { error: updateError } = await supabaseClient
          .from('user_weekly_menus')
          .update({
            payload: { ...menuData.payload, days: updatedDays },
            updated_at: new Date().toISOString()
          })
          .eq('menu_id', menuData.menu_id);

        if (updateError) {
          console.error('[use-swap] Error updating menu:', updateError);
        }

        // Also update user_daily_recipes
        const dayDate = new Date(weekStartStr);
        dayDate.setDate(dayDate.getDate() + validatedInput.day);
        const dateStr = dayDate.toISOString().split('T')[0];

        const updateField = mealType === 'lunch' ? 'lunch_recipe_id' : 'dinner_recipe_id';
        await supabaseClient
          .from('user_daily_recipes')
          .update({ [updateField]: randomRecipe.id })
          .eq('user_id', user.id)
          .eq('date', dateStr);

        // Update user_weekly_menu_items
        const dayOfWeekVal = validatedInput.day + 1; // 1-7
        await supabaseClient
          .from('user_weekly_menu_items')
          .update({ 
            recipe_id: randomRecipe.id,
            target_servings: roundedServings,
            scale_factor: portionFactor,
            portion_factor: portionFactor
          })
          .eq('weekly_menu_id', menuData.menu_id)
          .eq('day_of_week', dayOfWeekVal)
          .eq('meal_slot', mealType);
      }
    }

    console.log('[use-swap] ✅ Recipe swapped successfully!')

    // ── SUCCESS: Now deduct credits atomically ──
    console.log('[use-swap] Deducting 1 credit after successful swap')
    const { data: creditsCheck, error: creditsError } = await supabaseClient.rpc('check_and_consume_credits', {
      p_user_id: user.id,
      p_feature: 'swap',
      p_cost: 1
    })

    if (creditsError) {
      console.error('[use-swap] Credits deduction error after success:', creditsError)
      // Still return the result
    }

    // Tag the transaction with idempotency key if provided
    if (requestId && !creditsError) {
      await supabaseClient
        .from('credit_transactions')
        .update({ idempotency_key: `swap:${requestId}` })
        .eq('user_id', user.id)
        .eq('feature', 'swap')
        .is('idempotency_key', null)
        .order('created_at', { ascending: false })
        .limit(1);
    }

    return new Response(
      JSON.stringify({
        success: true,
        creditsRemaining: creditsCheck?.new_balance ?? null,
        newRecipe: {
          id: randomRecipe.id,
          title: randomRecipe.title,
          image_url: randomRecipe.image_url || randomRecipe.image_path || null,
          prep_time_min: randomRecipe.prep_time_min || 0,
          total_time_min: randomRecipe.total_time_min || 0,
          calories_kcal: randomRecipe.calories_kcal || 0,
          proteins_g: randomRecipe.proteins_g || 0,
          carbs_g: randomRecipe.carbs_g || 0,
          fats_g: randomRecipe.fats_g || 0,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in use-swap:', error)
    // Fire-and-forget error logging
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const { createClient: cc } = await import('../_shared/deps.ts');
      const admin = cc(supabaseUrl, serviceKey);
      await admin.from('edge_function_errors').insert({
        function_name: 'use-swap',
        error_message: error instanceof Error ? error.message : String(error),
        error_stack: error instanceof Error ? error.stack?.substring(0, 2000) : null,
      });
    } catch { /* ignore */ }
    
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ error: 'Validation error', details: error.errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
