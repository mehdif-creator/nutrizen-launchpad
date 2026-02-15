import { createClient } from '../_shared/deps.ts';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const ALLOWED_ORIGINS = [
  'https://mynutrizen.fr',
  'https://app.mynutrizen.fr',
  'https://www.mynutrizen.fr',
  'http://localhost:5173',
  'http://localhost:3000',
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  const isAllowed = origin && ALLOWED_ORIGINS.includes(origin);
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

// Input validation schema
const GenerateMenuSchema = z.object({
  week_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
}).strict();

// Redaction utilities for sensitive data logging
const redactId = (id: string): string => id ? id.substring(0, 8) + '***' : 'null';
const redactEmail = (email: string): string => email ? email.split('@')[0] + '@***' : 'null';

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    // Verify JWT and get user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      throw new Error("Invalid token");
    }

    console.log(`[generate-menu] Processing request for user: ${redactId(user.id)}`);

    // Calculate current week start (Monday)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + diff);
    weekStart.setHours(0, 0, 0, 0);
    const weekStartStr = weekStart.toISOString().split('T')[0];

    // Atomic credit deduction via check_and_consume_credits RPC
    // Uses user_wallets with FOR UPDATE lock + ledger entry
    const MENU_GENERATION_COST = 7;
    const creditReferenceId = `generate_week:${weekStartStr}:${user.id}`;
    
    console.log(`[generate-menu] Consuming ${MENU_GENERATION_COST} credits via atomic RPC (ref: ${creditReferenceId})`);
    
    const { data: creditsCheck, error: creditsError } = await supabaseClient.rpc('check_and_consume_credits', {
      p_user_id: user.id,
      p_feature: 'generate_week',
      p_cost: MENU_GENERATION_COST,
    });

    if (creditsError) {
      console.error('[generate-menu] Credits RPC error:', creditsError);
      return new Response(
        JSON.stringify({ 
          success: false,
          message: 'Erreur lors de la vérification des crédits.'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!creditsCheck?.success) {
      const currentBalance = (creditsCheck?.current_balance ?? 0);
      console.log(`[generate-menu] Insufficient credits: ${currentBalance} < ${MENU_GENERATION_COST}`);
      return new Response(
        JSON.stringify({ 
          success: false,
          error_code: creditsCheck?.error_code || 'INSUFFICIENT_CREDITS',
          message: `Crédits insuffisants. Tu as ${currentBalance} crédits, il en faut ${MENU_GENERATION_COST} pour générer un menu.`,
          current_balance: currentBalance,
          required: MENU_GENERATION_COST,
        }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[generate-menu] ✅ ${MENU_GENERATION_COST} credits consumed. New balance: ${creditsCheck.new_balance}`);

    // Get user's household info for portion calculations
    const { data: profileData, error: profileError } = await supabaseClient
      .from("user_profiles")
      .select("household_adults, household_children")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.warn("[generate-menu] Could not fetch household info, using defaults:", profileError);
    }

    const householdAdults = profileData?.household_adults ?? 1;
    const householdChildren = profileData?.household_children ?? 0;
    const effectiveHouseholdSize = householdAdults + householdChildren * 0.7;

    console.log(`[generate-menu] Household size: ${householdAdults} adults + ${householdChildren} children = ${effectiveHouseholdSize.toFixed(1)} effective portions`);

    // Parse and validate input
    const body = await req.json().catch(() => ({}));
    const validatedInput = GenerateMenuSchema.parse(body);

    // Get user preferences
    const { data: preferences, error: prefError } = await supabaseClient
      .from("preferences")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (prefError && prefError.code !== "PGRST116") {
      console.error("Error fetching preferences:", prefError);
    }

    console.log("[generate-menu] User preferences:", preferences ? "Found" : "Not found");

    // Validate age if present
    if (preferences?.age) {
      const age = preferences.age;
      if (age < 18 || age > 99) {
        console.error(`[generate-menu] Invalid age: ${age}`);
        return new Response(
          JSON.stringify({ 
            success: false,
            message: 'Âge invalide. L\'âge doit être entre 18 et 99 ans.'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // ============================================================
    // SAFETY GATE: Build user restriction keys from dictionary
    // This ensures synonym matching (porc -> jambon, lardon, bacon, etc.)
    // ============================================================
    
    // Map user-facing allergen names to canonical keys
    const allergenToKeyMap: Record<string, string> = {
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

    // Collect all restriction keys the user wants to avoid
    let userRestrictionKeys: string[] = [];
    
    // 1. From structured allergies array
    if (preferences?.allergies && Array.isArray(preferences.allergies)) {
      const allergyKeys = preferences.allergies
        .map((a: string) => allergenToKeyMap[a] || a.toLowerCase().trim())
        .filter((k: string) => k.length > 0);
      userRestrictionKeys.push(...allergyKeys);
      console.log(`[generate-menu] Allergen keys from preferences.allergies: ${allergyKeys.join(", ")}`);
    }

    // 2. From aliments_eviter array - need to map to canonical keys via dictionary
    if (preferences?.aliments_eviter && Array.isArray(preferences.aliments_eviter)) {
      const avoidItems = preferences.aliments_eviter
        .map((ing: string) => (ing || '').toLowerCase().trim())
        .filter((ing: string) => ing.length > 0);
      
      if (avoidItems.length > 0) {
        // Query dictionary to find canonical keys for these items
        const { data: dictMatches } = await supabaseClient
          .from('restriction_dictionary')
          .select('key, pattern')
          .or(avoidItems.map(item => `pattern.ilike.%${item}%`).join(','));
        
        if (dictMatches && dictMatches.length > 0) {
          const mappedKeys = dictMatches.map((d: any) => d.key);
          userRestrictionKeys.push(...mappedKeys);
          console.log(`[generate-menu] Mapped aliments_eviter to keys via dictionary: ${[...new Set(mappedKeys)].join(", ")}`);
        }
        
        // Also add the raw items as keys (in case they're already canonical)
        for (const item of avoidItems) {
          if (allergenToKeyMap[item.charAt(0).toUpperCase() + item.slice(1)]) {
            userRestrictionKeys.push(allergenToKeyMap[item.charAt(0).toUpperCase() + item.slice(1)]);
          } else {
            // Check if it's a known key directly (e.g., "pork", "dairy")
            const { data: directMatch } = await supabaseClient
              .from('restriction_dictionary')
              .select('key')
              .eq('key', item)
              .limit(1);
            if (directMatch && directMatch.length > 0) {
              userRestrictionKeys.push(item);
            } else {
              // For "porc" specifically, map to "pork"
              if (item === 'porc' || item === 'cochon') {
                userRestrictionKeys.push('pork');
              }
            }
          }
        }
      }
    }

    // 3. From autres_allergies free text
    if (preferences?.autres_allergies) {
      const freeText = (preferences.autres_allergies || '').toLowerCase().trim();
      if (freeText.length > 0) {
        // Query dictionary to find canonical keys
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
        console.log(`[generate-menu] Extracted keys from autres_allergies text: ${freeText}`);
      }
    }

    // 4. Diet type hard constraints
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

    if (preferences?.type_alimentation) {
      const dietKey = preferences.type_alimentation.toLowerCase().trim();
      const dietExclusions = DIET_EXCLUSIONS[dietKey];
      if (dietExclusions) {
        userRestrictionKeys.push(...dietExclusions);
        console.log(`[generate-menu] Diet "${dietKey}" adds hard exclusions: ${dietExclusions.join(', ')}`);
      }
    }

    // Deduplicate restriction keys
    userRestrictionKeys = [...new Set(userRestrictionKeys)];
    console.log(`[generate-menu] 🛡️ SAFETY GATE: User restriction keys = [${userRestrictionKeys.join(", ")}]`);

    // Helper function to build query with filters
    const buildRecipeQuery = (
      fallbackLevel = 0
    ) => {
      let query = supabaseClient
        .from("recipes")
        .select("id, title, prep_time_min, total_time_min, calories_kcal, proteins_g, carbs_g, fats_g, cuisine_type, meal_type, diet_type, allergens, difficulty_level, appliances, image_url, image_path, ingredients_text, ingredient_keys")
        .eq("published", true);

      console.log(`[generate-menu] Building query for fallback level: F${fallbackLevel}`);

      // ============================================================
      // CRITICAL: ALWAYS enforce restriction keys at EVERY fallback level
      // This uses the ingredient_keys array which contains canonical keys
      // derived from the restriction_dictionary (pork, dairy, gluten, etc.)
      // ============================================================
      if (userRestrictionKeys.length > 0) {
        // Exclude any recipe whose ingredient_keys overlaps with user restrictions
        // Using NOT overlap operator via filter
        // Note: Supabase doesn't have a direct "not overlaps" so we filter post-query
        console.log(`[generate-menu] Will filter out recipes with ingredient_keys overlapping: [${userRestrictionKeys.join(", ")}]`);
      }

      if (preferences) {
        // Legacy allergen check (keep for recipes without ingredient_keys)
        if (preferences.allergies && Array.isArray(preferences.allergies) && preferences.allergies.length > 0) {
          const userAllergens = preferences.allergies.map((a: string) => allergenToKeyMap[a] || a.toLowerCase());
          query = query.not("allergens", "cs", `{${userAllergens.join(",")}}`);
          console.log(`[generate-menu] Legacy allergen exclusions: ${userAllergens.join(", ")}`);
        }

        // ALWAYS enforce appliance constraints (but allow recipes with no appliances specified)
        if (preferences.appliances_owned && Array.isArray(preferences.appliances_owned)) {
          const ownedAppliances = preferences.appliances_owned;
          
          // If user doesn't own airfryer, exclude airfryer recipes
          // Simple check: only exclude if appliances explicitly contains airfryer
          if (!ownedAppliances.includes('airfryer')) {
            query = query.not("appliances", "cs", '{"airfryer"}');
            console.log(`[generate-menu] Excluding airfryer recipes (not owned)`);
          }
        }

        // F0: Strict filters
        if (fallbackLevel === 0) {
          // Filter by prep time
          if (preferences.temps_preparation) {
            let maxPrepTime = 60;
            if (preferences.temps_preparation === "<10 min") maxPrepTime = 10;
            else if (preferences.temps_preparation === "10-20 min") maxPrepTime = 20;
            else if (preferences.temps_preparation === "20-40 min") maxPrepTime = 40;
            query = query.lte("prep_time_min", maxPrepTime);
            console.log(`[generate-menu] Max prep time: ${maxPrepTime} min`);
          }

          // Filter by total time
          if (preferences.temps_preparation) {
            let maxTotalTime = 90;
            if (preferences.temps_preparation === "<10 min") maxTotalTime = 15;
            else if (preferences.temps_preparation === "10-20 min") maxTotalTime = 30;
            else if (preferences.temps_preparation === "20-40 min") maxTotalTime = 60;
            query = query.lte("total_time_min", maxTotalTime);
            console.log(`[generate-menu] Max total time: ${maxTotalTime} min`);
          }

          // Filter by calories if range provided
          if (preferences.objectif_calorique) {
            const calorieMap: Record<string, [number, number]> = {
              "1200-1500 kcal": [300, 500],
              "1500-1800 kcal": [375, 600],
              "1800-2100 kcal": [450, 700],
              "2100+ kcal": [525, 900]
            };
            const [minCal, maxCal] = calorieMap[preferences.objectif_calorique] || [0, 10000];
            query = query.gte("calories_kcal", minCal).lte("calories_kcal", maxCal);
            console.log(`[generate-menu] Calorie range: ${minCal}-${maxCal} kcal`);
          }

          // Filter by minimum proteins
          if (preferences.apport_proteines_g_kg && preferences.poids_actuel_kg) {
            const minProteins = Math.round((preferences.apport_proteines_g_kg * preferences.poids_actuel_kg) / 3);
            query = query.gte("proteins_g", minProteins);
            console.log(`[generate-menu] Min proteins: ${minProteins}g per meal`);
          }

          // Filter by diet type (allow null diet_type for omnivores)
          if (preferences.type_alimentation && preferences.type_alimentation !== "Omnivore" && preferences.type_alimentation.toLowerCase() !== "omnivore") {
            query = query.or(`diet_type.eq.${preferences.type_alimentation.toLowerCase()},diet_type.is.null`);
            console.log(`[generate-menu] Diet type: ${preferences.type_alimentation}`);
          }

          // Filter by cuisine preference
          if (preferences.cuisine_preferee && Array.isArray(preferences.cuisine_preferee) && preferences.cuisine_preferee.length > 0) {
            query = query.in("cuisine_type", preferences.cuisine_preferee);
            console.log(`[generate-menu] Preferred cuisines: ${preferences.cuisine_preferee.join(", ")}`);
          }

          // Filter by difficulty level
          if (preferences.niveau_cuisine) {
            const difficultyMap: Record<string, string> = {
              "Débutant": "beginner",
              "Intermédiaire": "intermediate",
              "Expert": "expert"
            };
            const difficulty = difficultyMap[preferences.niveau_cuisine];
            if (difficulty) {
              query = query.eq("difficulty_level", difficulty);
              console.log(`[generate-menu] Difficulty: ${difficulty}`);
            }
          }
        }
        
        // F1: Widen time constraints (+10 prep, +15 total)
        else if (fallbackLevel === 1) {
          if (preferences.temps_preparation) {
            let maxPrepTime = 60;
            if (preferences.temps_preparation === "<10 min") maxPrepTime = 20;
            else if (preferences.temps_preparation === "10-20 min") maxPrepTime = 30;
            else if (preferences.temps_preparation === "20-40 min") maxPrepTime = 50;
            query = query.lte("prep_time_min", maxPrepTime);
            console.log(`[generate-menu] F1: Relaxed prep time to ${maxPrepTime} min`);
          }

          if (preferences.temps_preparation) {
            let maxTotalTime = 90;
            if (preferences.temps_preparation === "<10 min") maxTotalTime = 30;
            else if (preferences.temps_preparation === "10-20 min") maxTotalTime = 45;
            else if (preferences.temps_preparation === "20-40 min") maxTotalTime = 75;
            query = query.lte("total_time_min", maxTotalTime);
            console.log(`[generate-menu] F1: Relaxed total time to ${maxTotalTime} min`);
          }

          // Keep other filters from F0 (allow null diet_type)
          if (preferences.type_alimentation && preferences.type_alimentation !== "Omnivore" && preferences.type_alimentation.toLowerCase() !== "omnivore") {
            query = query.or(`diet_type.eq.${preferences.type_alimentation.toLowerCase()},diet_type.is.null`);
          }
        }
        
        // F2: Ignore diet tags but keep all other filters
        else if (fallbackLevel === 2) {
          console.log(`[generate-menu] F2: Ignoring diet type filter`);
          // Time filters relaxed like F1
          if (preferences.temps_preparation) {
            let maxPrepTime = 60;
            if (preferences.temps_preparation === "<10 min") maxPrepTime = 20;
            else if (preferences.temps_preparation === "10-20 min") maxPrepTime = 30;
            else if (preferences.temps_preparation === "20-40 min") maxPrepTime = 50;
            query = query.lte("prep_time_min", maxPrepTime);
          }
        }
        
        // F3: Ignore cuisines, courses, and meal types
        else if (fallbackLevel === 3) {
          console.log(`[generate-menu] F3: Ignoring cuisine, course, and meal type filters`);
          // No additional filters - just exclusions and appliances
        }
        
        // F4: Last resort - absolutely minimal filters
        else if (fallbackLevel === 4) {
          console.log(`[generate-menu] F4: Last resort - published recipes only with mandatory exclusions`);
          // Only allergens, exclusions, and appliances enforced (already applied above)
          // This will match any published recipe that doesn't violate exclusions
        }
      }

      return query.limit(100);
    };

    // Fallback ladder strategy
    let recipes: any[] = [];
    let usedFallback: string | null = null;
    let fallbackLevel = 0;

    // Try each fallback level until we get at least 7 recipes
    for (let level = 0; level <= 4; level++) {
      console.log(`[generate-menu] Attempting fallback level F${level}...`);
      
      const { data: levelRecipes, error: recipeError } = await buildRecipeQuery(level);
      
      if (recipeError) {
        console.error(`[generate-menu] Error at F${level}:`, recipeError);
        continue;
      }

      // ============================================================
      // SAFETY GATE: Filter out recipes that violate user restrictions
      // This is the CRITICAL safety layer using ingredient_keys
      // ============================================================
      let safeRecipes = levelRecipes || [];
      
      if (userRestrictionKeys.length > 0 && safeRecipes.length > 0) {
        const beforeCount = safeRecipes.length;
        
        safeRecipes = safeRecipes.filter((recipe: any) => {
          const recipeKeys = recipe.ingredient_keys || [];
          
          // Check if ANY user restriction key is in the recipe's ingredient_keys
          const violations = userRestrictionKeys.filter(restrictionKey => 
            recipeKeys.includes(restrictionKey)
          );
          
          if (violations.length > 0) {
            console.log(`[generate-menu] 🚫 BLOCKED: "${recipe.title}" - contains: [${violations.join(", ")}]`);
            return false;
          }
          return true;
        });
        
        const afterCount = safeRecipes.length;
        console.log(`[generate-menu] Safety filter: ${beforeCount} → ${afterCount} recipes (blocked ${beforeCount - afterCount})`);
      }

      const recipeCount = safeRecipes.length;
      console.log(`[generate-menu] F${level} yielded ${recipeCount} SAFE recipes`);

      if (recipeCount >= 7) {
        recipes = safeRecipes;
        fallbackLevel = level;
        usedFallback = level > 0 ? `F${level}` : null;
        console.log(`[generate-menu] SUCCESS: Using F${level} with ${recipeCount} safe candidates`);
        break;
      }
      
      // If we have some recipes but not enough, save them and continue
      if (recipeCount > recipes.length) {
        recipes = safeRecipes;
        fallbackLevel = level;
        usedFallback = `F${level}`;
        console.log(`[generate-menu] F${level} has ${recipeCount} recipes, continuing to next level...`);
      }
    }

    if (!recipes || recipes.length === 0) {
      console.error("[generate-menu] CRITICAL: No safe recipes found after all fallback attempts (F0-F4)");
      console.error("[generate-menu] User restrictions:", userRestrictionKeys);
      
      // Count total published recipes for diagnostics
      const { count: totalRecipes } = await supabaseClient
        .from("recipes")
        .select("id", { count: "exact", head: true })
        .eq("published", true);
      
      console.error("[generate-menu] Total published recipes in DB:", totalRecipes);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `Impossible de trouver des recettes compatibles avec tes restrictions (${userRestrictionKeys.join(", ")}). Essaie de modifier tes préférences ou contacte le support.`,
          usedFallback: null,
          error: "NO_SAFE_RECIPES",
          restrictions: userRestrictionKeys
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Select 14 distinct recipes for the week (7 lunch + 7 dinner)
    const shuffled = [...recipes].sort(() => Math.random() - 0.5);
    let selectedRecipes = shuffled.slice(0, Math.min(14, recipes.length));

    // Fill remaining slots if less than 14 recipes available (allow repeats)
    while (selectedRecipes.length < 14) {
      const nextIndex = selectedRecipes.length % shuffled.length;
      selectedRecipes.push(shuffled[nextIndex]);
    }
    
    // Split into lunch (first 7) and dinner (last 7)
    const lunchRecipes = selectedRecipes.slice(0, 7);
    const dinnerRecipes = selectedRecipes.slice(7, 14);

    // ============================================================
    // POST-SELECTION VALIDATION (Defense in Depth)
    // Double-check that NO selected recipe violates restrictions
    // Validate ALL recipes (both lunch and dinner)
    // ============================================================
    const allSelectedRecipes = [...lunchRecipes, ...dinnerRecipes];
    const validationResults = allSelectedRecipes.map((recipe: any) => {
      const recipeKeys = recipe.ingredient_keys || [];
      const violations = userRestrictionKeys.filter(k => recipeKeys.includes(k));
      return { 
        recipe_id: recipe.id, 
        title: recipe.title, 
        violations,
        safe: violations.length === 0
      };
    });

    const unsafeRecipes = validationResults.filter(r => !r.safe);
    
    if (unsafeRecipes.length > 0) {
      console.error("[generate-menu] 🚨 POST-VALIDATION FAILED: Unsafe recipes detected after selection!");
      for (const unsafe of unsafeRecipes) {
        console.error(`[generate-menu] - ${unsafe.title}: violates [${unsafe.violations.join(", ")}]`);
      }
      
      // AUTO-REPAIR: Try to swap unsafe recipes with safe alternatives
      let repairAttempts = 0;
      const maxRepairAttempts = 10;
      
      while (unsafeRecipes.length > 0 && repairAttempts < maxRepairAttempts) {
        repairAttempts++;
        console.log(`[generate-menu] Repair attempt ${repairAttempts}/${maxRepairAttempts}...`);
        
        for (const unsafe of unsafeRecipes) {
          // Find a safe alternative not already in selection
          const allSelectedIds = allSelectedRecipes.map((r: any) => r.id);
          const safeAlternative = shuffled.find((r: any) => 
            !allSelectedIds.includes(r.id) && 
            !(r.ingredient_keys || []).some((k: string) => userRestrictionKeys.includes(k))
          );
          
          if (safeAlternative) {
            // Check if it's in lunch or dinner
            let lunchIdx = lunchRecipes.findIndex((r: any) => r.id === unsafe.recipe_id);
            let dinnerIdx = dinnerRecipes.findIndex((r: any) => r.id === unsafe.recipe_id);
            
            if (lunchIdx !== -1) {
              console.log(`[generate-menu] ✅ Swapped lunch "${unsafe.title}" → "${safeAlternative.title}"`);
              lunchRecipes[lunchIdx] = safeAlternative;
            } else if (dinnerIdx !== -1) {
              console.log(`[generate-menu] ✅ Swapped dinner "${unsafe.title}" → "${safeAlternative.title}"`);
              dinnerRecipes[dinnerIdx] = safeAlternative;
            }
          }
        }
        
        // Re-validate all recipes
        const allRechecked = [...lunchRecipes, ...dinnerRecipes];
        const recheck = allRechecked.map((recipe: any) => {
          const recipeKeys = recipe.ingredient_keys || [];
          const violations = userRestrictionKeys.filter(k => recipeKeys.includes(k));
          return { recipe_id: recipe.id, title: recipe.title, violations, safe: violations.length === 0 };
        });
        
        unsafeRecipes.length = 0;
        unsafeRecipes.push(...recheck.filter(r => !r.safe));
      }
      
      if (unsafeRecipes.length > 0) {
        console.error("[generate-menu] 🚨 REPAIR EXHAUSTED: Could not find safe alternatives for all recipes");
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: `Impossible de générer un menu sûr avec tes restrictions. Certaines recettes contiennent des aliments interdits. Contacte le support.`,
            error: "SAFETY_VALIDATION_FAILED",
            restrictions: userRestrictionKeys,
            violations: unsafeRecipes
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }
    }

    console.log(`[generate-menu] ✅ POST-VALIDATION PASSED: All ${lunchRecipes.length + dinnerRecipes.length} recipes are safe`);
    console.log(`[generate-menu] Lunch recipes: ${lunchRecipes.map((r: any) => r.title).join(", ")}`);
    console.log(`[generate-menu] Dinner recipes: ${dinnerRecipes.map((r: any) => r.title).join(", ")}`);


    // Build weekly menu with portion factors for BOTH lunch and dinner
    const weekdays = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
    const roundedServings = Math.max(1, Math.round(effectiveHouseholdSize));
    
    // Helper to build a meal entry
    const buildMealEntry = (recipe: any, dayIndex: number, mealType: 'lunch' | 'dinner') => {
      const baseServings = recipe.base_servings || recipe.servings || 2;
      const portionFactor = roundedServings / baseServings;
      
      return {
        recipe_id: recipe.id,
        title: recipe.title,
        image_url: recipe.image_url || recipe.image_path || null,
        prep_min: recipe.prep_time_min || 0,
        total_min: recipe.total_time_min || 0,
        calories: Math.round((recipe.calories_kcal || 0) * portionFactor),
        proteins_g: Math.round((recipe.proteins_g || 0) * portionFactor),
        carbs_g: Math.round((recipe.carbs_g || 0) * portionFactor),
        fats_g: Math.round((recipe.fats_g || 0) * portionFactor),
        portion_factor: portionFactor,
        servings_used: roundedServings,
        base_servings: baseServings,
      };
    };
    
    // Build days with both lunch and dinner
    const days = weekdays.map((dayName, index) => {
      const lunchRecipe = lunchRecipes[index];
      const dinnerRecipe = dinnerRecipes[index];
      
      return {
        day: dayName,
        lunch: buildMealEntry(lunchRecipe, index, 'lunch'),
        dinner: buildMealEntry(dinnerRecipe, index, 'dinner'),
      };
    });

    console.log(`[generate-menu] Upserting menu for week starting: ${weekStartStr}`);

    // Upsert weekly menu with fallback tracking and household info
    const { data: menu, error: menuError } = await supabaseClient
      .from("user_weekly_menus")
      .upsert({
        user_id: user.id,
        week_start: weekStartStr,
        payload: { 
          days,
          household: {
            adults: householdAdults,
            children: householdChildren,
            effective_size: effectiveHouseholdSize
          }
        },
        used_fallback: usedFallback
      }, {
        onConflict: "user_id,week_start"
      })
      .select()
      .single();

    if (menuError) {
      console.error("[generate-menu] Error upserting menu:", menuError);
      throw new Error("Failed to save menu");
    }

    console.log(`[generate-menu] Menu saved successfully. Menu ID: ${menu.menu_id}`);

    // ========================================
    // POPULATE user_weekly_menu_items table
    // Insert BOTH lunch AND dinner for each day
    // ========================================
    
    // First, delete any existing items for this menu (in case of regeneration)
    const { error: deleteError } = await supabaseClient
      .from("user_weekly_menu_items")
      .delete()
      .eq("weekly_menu_id", menu.menu_id);

    if (deleteError) {
      console.error("[generate-menu] Error deleting old menu items:", deleteError);
    } else {
      console.log(`[generate-menu] Cleared existing menu items for menu ${menu.menu_id}`);
    }

    // Build menu items for both lunch and dinner
    // day_of_week: 1=Monday, 2=Tuesday, ..., 7=Sunday (matching DB constraint 1-7)
    const menuItems: any[] = [];
    
    days.forEach((day, index) => {
      const dayOfWeek = index + 1; // 1-7 for Mon-Sun
      
      // Add lunch item
      menuItems.push({
        weekly_menu_id: menu.menu_id,
        recipe_id: day.lunch.recipe_id,
        day_of_week: dayOfWeek,
        meal_slot: 'lunch',
        target_servings: day.lunch.servings_used,
        scale_factor: day.lunch.portion_factor,
        portion_factor: day.lunch.portion_factor
      });
      
      // Add dinner item
      menuItems.push({
        weekly_menu_id: menu.menu_id,
        recipe_id: day.dinner.recipe_id,
        day_of_week: dayOfWeek,
        meal_slot: 'dinner',
        target_servings: day.dinner.servings_used,
        scale_factor: day.dinner.portion_factor,
        portion_factor: day.dinner.portion_factor
      });
    });

    const { error: itemsError } = await supabaseClient
      .from("user_weekly_menu_items")
      .insert(menuItems);

    if (itemsError) {
      console.error("[generate-menu] Error inserting menu items:", itemsError);
      // Continue anyway - the menu was saved successfully
    } else {
      console.log(`[generate-menu] Inserted ${menuItems.length} menu items for shopping list generation`);
    }

    // ========================================
    // ALSO populate user_daily_recipes table
    // This is what the dashboard RPC reads from
    // ========================================
    console.log(`[generate-menu] Populating user_daily_recipes table for dashboard...`);
    
    // Delete existing entries for this week
    const { error: deleteRecipesError } = await supabaseClient
      .from("user_daily_recipes")
      .delete()
      .eq("user_id", user.id)
      .gte("date", weekStartStr)
      .lt("date", new Date(new Date(weekStartStr).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

    if (deleteRecipesError) {
      console.error("[generate-menu] Error deleting old daily recipes:", deleteRecipesError);
    }

    // Insert one row per day into user_daily_recipes with BOTH lunch and dinner
    const dailyRecipes = days.map((day, index) => {
      const dayDate = new Date(weekStartStr);
      dayDate.setDate(dayDate.getDate() + index);
      return {
        user_id: user.id,
        date: dayDate.toISOString().split('T')[0],
        lunch_recipe_id: day.lunch.recipe_id,
        dinner_recipe_id: day.dinner.recipe_id,
        day_of_week: index, // 0=Monday
      };
    });

    const { error: dailyRecipesError } = await supabaseClient
      .from("user_daily_recipes")
      .upsert(dailyRecipes, { onConflict: 'user_id,date' });

    if (dailyRecipesError) {
      console.error("[generate-menu] Error upserting daily recipes:", dailyRecipesError);
    } else {
      console.log(`[generate-menu] Inserted ${dailyRecipes.length} daily recipe entries for dashboard`);
    }

    console.log(`[generate-menu] ✅ SUCCESS: Generated menu ${menu.menu_id} with ${usedFallback || 'strict filters'}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        days, 
        menu_id: menu.menu_id,
        week_start: weekStartStr,
        usedFallback: usedFallback,
        fallbackLevel: fallbackLevel
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[generate-menu] Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
