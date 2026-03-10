import { createClient } from '../_shared/deps.ts';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { checkRateLimit, rateLimitExceededResponse } from '../_shared/rateLimit.ts';
import { getCorsHeaders, getSecurityHeaders, logEdgeFunctionError } from '../_shared/security.ts';

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

    // ── Rate limiting ─────────────────────────────────────────────────────────
    // NOTE: `check_rate_limit` refills in **tokens/minute** (see DB function), so keep costs small.
    const rl = await checkRateLimit(supabaseClient, {
      identifier: `user:${user.id}`,
      endpoint: 'generate-menu',
      maxTokens: 2,     // burst
      refillRate: 1,    // 1 request/min
      cost: 1,
    });
    if (!rl.allowed) {
      console.log(`[generate-menu] Rate limit exceeded for user ${redactId(user.id)} — retry after ${rl.retryAfter}s`);
      return rateLimitExceededResponse(corsHeaders, rl.retryAfter);
    }
    // ── End rate limiting ──────────────────────────────────────────────────────

    // Parse and validate input (read body once)
    const body = await req.json().catch(() => ({}));
    const validatedInput = GenerateMenuSchema.parse(body);

    // Calculate current week start (Monday) — allow override from request
    const currentDate = new Date();
    const dayOfWeek = currentDate.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(currentDate);
    weekStart.setDate(currentDate.getDate() + diff);
    weekStart.setHours(0, 0, 0, 0);
    const defaultWeekStartStr = weekStart.toISOString().split('T')[0];
    const weekStartStr = validatedInput.week_start ?? defaultWeekStartStr;

    // ── Server-side subscription gate ──────────────────────────────────────────
    const { data: subRow } = await supabaseClient
      .from('subscriptions')
      .select('status, trial_end, current_period_end')
      .eq('user_id', user.id)
      .maybeSingle();

    const now = new Date();
    const isActiveSub = subRow?.status === 'active';
    const isTrialing =
      subRow?.status === 'trialing' &&
      subRow.trial_end != null &&
      new Date(subRow.trial_end) > now;
    const hasValidAccess = isActiveSub || isTrialing;

    // ── Fetch all user data in parallel (new tables + legacy fallback) ──
    const [
      { data: profileData },
      { data: preferences },
      { data: userProfile },
      { data: userObjectives },
      { data: userEatingHabits },
      { data: userMealsConfig },
      { data: userAllergies },
      { data: userFoodStyle },
      { data: userNutritionGoals },
      { data: userHousehold },
      { data: userLifestyle },
    ] = await Promise.all([
      supabaseClient.from('profiles').select('household_adults, household_children, kid_portion_ratio, meals_per_day').eq('id', user.id).single(),
      supabaseClient.from('preferences').select('*').eq('user_id', user.id).maybeSingle(),
      supabaseClient.from('user_profile').select('*').eq('user_id', user.id).maybeSingle(),
      supabaseClient.from('user_objectives').select('*').eq('user_id', user.id).maybeSingle(),
      supabaseClient.from('user_eating_habits').select('*').eq('user_id', user.id).maybeSingle(),
      supabaseClient.from('user_meals_config').select('*').eq('user_id', user.id),
      supabaseClient.from('user_allergies').select('*').eq('user_id', user.id).maybeSingle(),
      supabaseClient.from('user_food_style').select('*').eq('user_id', user.id).maybeSingle(),
      supabaseClient.from('user_nutrition_goals').select('*').eq('user_id', user.id).maybeSingle(),
      supabaseClient.from('user_household').select('*').eq('user_id', user.id).maybeSingle(),
      supabaseClient.from('user_lifestyle').select('*').eq('user_id', user.id).maybeSingle(),
    ]);

    const hasNewTables = !!(userProfile || userEatingHabits || userAllergies || userFoodStyle);
    console.log(`[generate-menu] Data sources: newTables=${hasNewTables}, legacyPrefs=${!!preferences}`);

    // ── Build unified effective preferences from new tables, fallback to legacy ──
    const eff = {
      age: userProfile?.age ?? preferences?.age ?? null,
      currentWeight: userProfile?.current_weight ?? preferences?.poids_actuel_kg ?? null,
      medicalConditions: userProfile?.medical_conditions ?? [],
      activityLevel: userProfile?.activity_level ?? preferences?.niveau_activite ?? null,

      mainGoal: userObjectives?.main_goal ?? preferences?.objectif_principal ?? null,
      mainBlockers: userObjectives?.main_blockers ?? [],

      mealsPerDay: userEatingHabits?.meals_per_day ?? preferences?.repas_par_jour ?? profileData?.meals_per_day ?? 2,
      appetiteSize: userEatingHabits?.appetite_size ?? null,
      prepTime: userEatingHabits?.prep_time ?? (preferences?.temps_preparation ? [preferences.temps_preparation] : []),
      batchCooking: userEatingHabits?.batch_cooking ?? preferences?.batch_cooking ?? null,
      cookingLevel: userEatingHabits?.cooking_level ?? preferences?.niveau_cuisine ?? null,
      availableTools: userEatingHabits?.available_tools ?? [
        ...(preferences?.appliances_owned || []),
        ...(preferences?.ustensiles || []),
      ],

      // Allergies: new format is jsonb array [{name, type, traces_ok}]
      allergiesRaw: userAllergies?.allergies ?? null,
      otherAllergies: userAllergies?.other_allergies ?? preferences?.autres_allergies ?? null,
      tracesAccepted: userAllergies?.traces_accepted ?? false,
      // Legacy flat array fallback
      allergiesFlat: preferences?.allergies ?? [],

      dietType: userFoodStyle?.diet_type ?? preferences?.type_alimentation ?? null,
      foodsToAvoid: userFoodStyle?.foods_to_avoid ?? preferences?.aliments_eviter ?? [],
      favoriteIngredients: userFoodStyle?.favorite_ingredients ?? preferences?.ingredients_favoris ?? [],
      favoriteCuisines: userFoodStyle?.favorite_cuisines ?? preferences?.cuisine_preferee ?? [],
      spiceLevel: userFoodStyle?.spice_level ?? preferences?.niveau_epices ?? null,
      cookingMethod: userFoodStyle?.cooking_method ?? null,
      preferOrganic: userFoodStyle?.prefer_organic ?? false,
      reduceSugar: userFoodStyle?.reduce_sugar ?? preferences?.limiter_sucre ?? false,
      preferSeasonal: userFoodStyle?.prefer_seasonal ?? false,

      caloricGoal: userNutritionGoals?.caloric_goal ?? null,
      targetKcal: userNutritionGoals?.target_kcal ?? null,
      proteinGPerDay: userNutritionGoals?.protein_g_per_day ?? null,
      macrosCustom: userNutritionGoals?.macros_custom ?? false,
      macroProteinPct: userNutritionGoals?.macro_protein_pct ?? 30,
      macroCarbsPct: userNutritionGoals?.macro_carbs_pct ?? 45,
      macroFatPct: userNutritionGoals?.macro_fat_pct ?? 25,
      dairyPreference: userNutritionGoals?.dairy_preference ?? preferences?.produits_laitiers ?? null,
      trackFiber: userNutritionGoals?.track_fiber ?? preferences?.recettes_riches_fibres ?? false,
      portionSize: userNutritionGoals?.portion_size ?? null,
      // Legacy fields for calorie/macro filters
      objectifCalorique: preferences?.objectif_calorique ?? null,
      apportProteinesGKg: preferences?.apport_proteines_g_kg ?? null,
      repartitionMacros: preferences?.repartition_macros ?? null,

      householdAdults: userHousehold?.adults_count ?? profileData?.household_adults ?? 1,
      householdChildren: userHousehold?.children_count ?? profileData?.household_children ?? 0,
      childrenAges: userHousehold?.children_ages ?? [],
      totalPortions: userHousehold?.total_portions ?? null,

      workType: userLifestyle?.work_type ?? null,
      scheduleType: userLifestyle?.schedule_type ?? null,
      stressLevel: userLifestyle?.stress_level ?? preferences?.niveau_stress ?? null,
      sleepHours: userLifestyle?.sleep_hours ?? preferences?.sommeil_heures ?? null,

      // Keep legacy fields for filters that haven't been remapped
      niveauSel: preferences?.niveau_sel ?? null,
      modeCuissonPrefere: preferences?.mode_cuisson_prefere ?? [],
    };

    // Meals config: determine which meals should generate recipes
    const mealsConfig = (userMealsConfig || []) as any[];
    const lunchConfig = mealsConfig.find((m: any) => m.meal_type === 'dejeuner');
    const dinnerConfig = mealsConfig.find((m: any) => m.meal_type === 'diner');
    const generateLunch = eff.mealsPerDay >= 2 && (lunchConfig?.generate_recipe !== false);
    const generateDinner = dinnerConfig?.generate_recipe !== false;

    console.log(`[generate-menu] mealsPerDay=${eff.mealsPerDay}, generateLunch=${generateLunch}, generateDinner=${generateDinner}`);

    // Validate age
    if (typeof eff.age === 'number' && (eff.age < 18 || eff.age > 99)) {
      console.error(`[generate-menu] Invalid age: ${eff.age}`);
      return new Response(
        JSON.stringify({ success: false, message: "Âge invalide. L'âge doit être entre 18 et 99 ans." }),
        { status: 400, headers: { ...corsHeaders, ...getSecurityHeaders(), 'Content-Type': 'application/json' } }
      );
    }

    // Medical conditions context for future AI prompt integration
    if (eff.medicalConditions.length > 0) {
      console.log(`[generate-menu] Medical conditions: ${eff.medicalConditions.length} condition(s) noted`);
    }

    // Determine actual slots: skip meals where generate_recipe=false
    const mealsPerDay = eff.mealsPerDay;
    const menuFeatureKey = mealsPerDay >= 2 ? 'generate_week_2' : 'generate_week_1';
    let menuCost = mealsPerDay >= 2 ? 11 : 6;

    // Prefer DB source-of-truth when available
    const { data: costRow, error: costError } = await supabaseClient
      .from('feature_costs')
      .select('cost')
      .eq('feature', menuFeatureKey)
      .maybeSingle();

    if (costError) {
      console.warn('[generate-menu] Could not read feature_costs, using fallback cost:', costError);
    } else if (typeof costRow?.cost === 'number') {
      menuCost = costRow.cost;
    }

    console.log(`[generate-menu] Menu cost resolved: feature=${menuFeatureKey} cost=${menuCost}`);

    if (!hasValidAccess) {
      // Free plan users can still generate menus using credits
      // Check if they have enough credits before blocking
      const { data: walletRow, error: walletError } = await supabaseClient
        .from('user_wallets')
        .select('subscription_credits, lifetime_credits')
        .eq('user_id', user.id)
        .maybeSingle();

      if (walletError) {
        console.warn('[generate-menu] Wallet read error (treating as 0):', walletError);
      }

      const userBalance = (walletRow?.subscription_credits ?? 0) + (walletRow?.lifetime_credits ?? 0);

      if (userBalance < menuCost) {
        console.log(`[generate-menu] Access denied — no subscription and insufficient credits (${userBalance}/${menuCost}) for user ${redactId(user.id)}`);
        return new Response(
          JSON.stringify({
            success: false,
            error_code: 'NO_ACCESS',
            message: userBalance === 0
              ? 'Un abonnement actif ou des crédits sont requis pour générer un menu.'
              : `Crédits insuffisants. Tu as ${userBalance} crédits, il en faut ${menuCost}.`,
            current_balance: userBalance,
            required: menuCost,
          }),
          { status: 403, headers: { ...corsHeaders, ...getSecurityHeaders(), 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[generate-menu] Free user with ${userBalance} credits — allowing access`);
    }
    // ── End subscription gate ───────────────────────────────────────────────────

    // ── Pre-check balance (read-only) — actual deduction AFTER successful menu generation ──
    const { data: walletPreCheck } = await supabaseClient
      .from('user_wallets')
      .select('subscription_credits, lifetime_credits')
      .eq('user_id', user.id)
      .maybeSingle();
    const preCheckBalance = (walletPreCheck?.subscription_credits ?? 0) + (walletPreCheck?.lifetime_credits ?? 0);

    if (preCheckBalance < menuCost) {
      console.log(`[generate-menu] Insufficient credits (pre-check): ${preCheckBalance} < ${menuCost}`);
      return new Response(
        JSON.stringify({
          success: false,
          error_code: 'INSUFFICIENT_CREDITS',
          message: `Crédits insuffisants. Tu as ${preCheckBalance} crédits, il en faut ${menuCost} pour générer un menu.`,
          current_balance: preCheckBalance,
          required: menuCost,
        }),
        { status: 402, headers: { ...corsHeaders, ...getSecurityHeaders(), 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[generate-menu] Pre-check OK: ${preCheckBalance} credits available, ${menuCost} required. Proceeding with generation...`);

    // ── Household portion calculation ──
    // Prefer new user_household with per-child age coefficients
    const childCoeff = (age: number): number => {
      if (age <= 3) return 0.3;
      if (age <= 8) return 0.5;
      if (age <= 13) return 0.7;
      return 1.0;
    };

    let effectiveHouseholdSize: number;
    if (eff.totalPortions && eff.totalPortions > 0) {
      // Pre-calculated in user_household
      effectiveHouseholdSize = eff.totalPortions;
    } else if (eff.childrenAges.length > 0) {
      const childSum = eff.childrenAges.reduce((s: number, a: number) => s + childCoeff(a), 0);
      effectiveHouseholdSize = eff.householdAdults + childSum;
    } else {
      const kidRatio = profileData?.kid_portion_ratio ?? 0.6;
      effectiveHouseholdSize = eff.householdAdults + eff.householdChildren * kidRatio;
    }
    const roundedHouseholdServings = Math.max(1, Math.round(effectiveHouseholdSize));

    // Per-meal portions from user_meals_config (may differ between lunch & dinner)
    const lunchPortions = lunchConfig?.portions ?? roundedHouseholdServings;
    const dinnerPortions = dinnerConfig?.portions ?? roundedHouseholdServings;

    console.log(`[generate-menu] Household: ${eff.householdAdults}A + ${eff.householdChildren}C = ${effectiveHouseholdSize.toFixed(1)} eff. portions`);
    console.log(`[generate-menu] Per-meal portions: lunch=${lunchPortions}, dinner=${dinnerPortions}`);

    // ============================================================
    // SAFETY GATE: Build user restriction keys from dictionary
    // ============================================================
    
    const allergenToKeyMap: Record<string, string> = {
      "Gluten": "gluten", "Lactose": "dairy", "Fruits à coque": "nuts",
      "Arachide": "peanuts", "Œufs": "eggs", "Fruits de mer": "shellfish",
      "Soja": "soy", "Sésame": "sesame", "Poisson": "fish",
      "Porc": "pork", "Bœuf": "beef",
    };

    let userRestrictionKeys: string[] = [];
    
    const ALLOWED_DIET_TYPES = new Set([
      'omnivore', 'vegetarien', 'végétarien', 'vegetarian',
      'vegan', 'végétalien', 'pescatarien', 'pescatarian',
      'halal', 'casher', 'kosher',
    ]);

    function escapePostgrestPattern(value: string): string {
      return value.replace(/[%_,.()'"\\\s]/g, (c) => `\\${c}`).slice(0, 50);
    }

    // 1. From NEW user_allergies (jsonb array [{name, type, traces_ok}])
    if (eff.allergiesRaw && Array.isArray(eff.allergiesRaw) && eff.allergiesRaw.length > 0) {
      const allergyKeys = eff.allergiesRaw
        .map((a: any) => {
          const name = typeof a === 'string' ? a : a.name;
          return allergenToKeyMap[name] || (name || '').toLowerCase().trim();
        })
        .filter((k: string) => k.length > 0);
      userRestrictionKeys.push(...allergyKeys);
      console.log(`[generate-menu] Allergen keys from user_allergies: ${allergyKeys.length} key(s)`);
    }
    // Fallback: legacy flat allergies array
    else if (eff.allergiesFlat && Array.isArray(eff.allergiesFlat) && eff.allergiesFlat.length > 0) {
      const allergyKeys = eff.allergiesFlat
        .map((a: string) => allergenToKeyMap[a] || a.toLowerCase().trim())
        .filter((k: string) => k.length > 0);
      userRestrictionKeys.push(...allergyKeys);
      console.log(`[generate-menu] Allergen keys from legacy preferences.allergies: ${allergyKeys.length} key(s)`);
    }

    // 2. From foods_to_avoid (new) or aliments_eviter (legacy)
    const avoidItems = (eff.foodsToAvoid || [])
      .map((ing: string) => (ing || '').toLowerCase().trim())
      .filter((ing: string) => ing.length > 0 && ing.length <= 50);

    if (avoidItems.length > 0) {
      const safeItems = avoidItems.map(escapePostgrestPattern).filter((i: string) => i.length > 0);
      
      if (safeItems.length > 0) {
        const orFilter = safeItems.map((item: string) => `pattern.ilike.%${item}%`).join(',');
        if (!/[()'"\\]/.test(orFilter)) {
          const { data: dictMatches } = await supabaseClient
            .from('restriction_dictionary')
            .select('key, pattern')
            .or(orFilter);
          
          if (dictMatches && dictMatches.length > 0) {
            const mappedKeys = dictMatches.map((d: any) => d.key);
            userRestrictionKeys.push(...mappedKeys);
            console.log(`[generate-menu] Mapped ${avoidItems.length} foods_to_avoid to ${[...new Set(mappedKeys)].length} key(s)`);
          }
        }
      }
      
      for (const item of avoidItems) {
        if (allergenToKeyMap[item.charAt(0).toUpperCase() + item.slice(1)]) {
          userRestrictionKeys.push(allergenToKeyMap[item.charAt(0).toUpperCase() + item.slice(1)]);
        } else {
          const { data: directMatch } = await supabaseClient
            .from('restriction_dictionary')
            .select('key')
            .eq('key', item)
            .limit(1);
          if (directMatch && directMatch.length > 0) {
            userRestrictionKeys.push(item);
          } else if (item === 'porc' || item === 'cochon') {
            userRestrictionKeys.push('pork');
          }
        }
      }
    }

    // 3. From other_allergies free text
    if (eff.otherAllergies) {
      const freeText = (eff.otherAllergies || '').toLowerCase().trim();
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
        console.log(`[generate-menu] Extracted keys from other_allergies text`);
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

    if (eff.dietType) {
      const dietKey = eff.dietType.toLowerCase().trim();
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
        .select("id, title, prep_time_min, total_time_min, calories_kcal, proteins_g, carbs_g, fats_g, cuisine_type, meal_type, diet_type, allergens, difficulty_level, appliances, image_url, image_path, ingredients_text, ingredient_keys, base_servings, servings")
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

      // Apply hard filters using unified eff.* object
      {
        // Legacy allergen check (keep for recipes without ingredient_keys)
        const allergyNames = eff.allergiesRaw
          ? (eff.allergiesRaw as any[]).map((a: any) => {
              const name = typeof a === 'string' ? a : a.name;
              return allergenToKeyMap[name] || (name || '').toLowerCase();
            })
          : (eff.allergiesFlat || []).map((a: string) => allergenToKeyMap[a] || a.toLowerCase());
        if (allergyNames.length > 0) {
          query = query.not("allergens", "cs", `{${allergyNames.join(",")}}`);
        }

        // Appliance constraints
        const ownedAppliances = eff.availableTools || [];
        const hasAirfryer = ownedAppliances.some((a: string) => 
          a.toLowerCase().replace(/\s/g, '') === 'airfryer' || 
          a.toLowerCase() === 'air fryer'
        );
        if (!hasAirfryer) {
          query = query.not("appliances", "cs", "{airfryer}");
          query = query.not("cooking_method", "cs", "{airfryer}");
          query = query.not("ingredients_text", "ilike", "%airfryer%");
          console.log(`[generate-menu] Excluding airfryer recipes`);
        }

        // HARD FILTER: Dairy exclusion
        if (eff.dairyPreference === 'Sans' || eff.dairyPreference === 'sans') {
          if (!userRestrictionKeys.includes('dairy')) {
            userRestrictionKeys.push('dairy');
            console.log(`[generate-menu] Hard filter: dairy excluded`);
          }
        }

        // HARD FILTER: Spice level
        if (eff.spiceLevel) {
          const spice = eff.spiceLevel.toLowerCase();
          if (spice === 'doux' || spice === 'sans épices') {
            query = query.eq("spice_level", "doux");
          } else if (spice === 'moyen') {
            query = query.in("spice_level", ["doux", "moyen"]);
          }
        }

        // Resolve prep time from new tables (array) or legacy (string)
        const firstPrepTime = eff.prepTime?.[0] ?? preferences?.temps_preparation ?? null;

        // F0: Strict filters
        if (fallbackLevel === 0) {
          if (firstPrepTime) {
            let maxPrepTime = 60;
            if (firstPrepTime === "<10 min" || firstPrepTime === '15min') maxPrepTime = 15;
            else if (firstPrepTime === "10-20 min" || firstPrepTime === '15_30min') maxPrepTime = 30;
            else if (firstPrepTime === "20-40 min" || firstPrepTime === '30_45min') maxPrepTime = 45;
            query = query.lte("prep_time_min", maxPrepTime);

            let maxTotalTime = 90;
            if (firstPrepTime === "<10 min" || firstPrepTime === '15min') maxTotalTime = 20;
            else if (firstPrepTime === "10-20 min" || firstPrepTime === '15_30min') maxTotalTime = 45;
            else if (firstPrepTime === "20-40 min" || firstPrepTime === '30_45min') maxTotalTime = 60;
            query = query.lte("total_time_min", maxTotalTime);
          }

          // Calorie filter: precise target_kcal from new tables, or legacy range
          if (eff.targetKcal && eff.targetKcal > 0) {
            const perMeal = Math.round(eff.targetKcal / Math.max(mealsPerDay, 1));
            const margin = Math.round(perMeal * 0.25);
            query = query.gte("calories_kcal", perMeal - margin).lte("calories_kcal", perMeal + margin);
            console.log(`[generate-menu] Calorie per meal: ${perMeal}±${margin} kcal (from target_kcal)`);
          } else if (eff.caloricGoal) {
            const goalMap: Record<string, [number, number]> = {
              'hypocalorique': [200, 500],
              'equilibre': [400, 700],
              'hypercalorique': [500, 900],
            };
            const [minCal, maxCal] = goalMap[eff.caloricGoal] || [0, 10000];
            if (minCal > 0) {
              query = query.gte("calories_kcal", minCal).lte("calories_kcal", maxCal);
            }
          } else if (eff.objectifCalorique) {
            const calorieMap: Record<string, [number, number]> = {
              "1200-1500 kcal": [300, 500],
              "1500-1800 kcal": [375, 600],
              "1800-2100 kcal": [450, 700],
              "2100+ kcal": [525, 900]
            };
            const [minCal, maxCal] = calorieMap[eff.objectifCalorique] || [0, 10000];
            query = query.gte("calories_kcal", minCal).lte("calories_kcal", maxCal);
          }

          // Protein filter
          if (eff.proteinGPerDay && eff.proteinGPerDay > 0) {
            const minProteins = Math.round(eff.proteinGPerDay / Math.max(mealsPerDay, 1));
            query = query.gte("proteins_g", minProteins);
          } else if (eff.apportProteinesGKg && eff.currentWeight) {
            const minProteins = Math.round((eff.apportProteinesGKg * eff.currentWeight) / 3);
            query = query.gte("proteins_g", minProteins);
          }

          // Diet type
          const rawDiet = (eff.dietType ?? '').toLowerCase().trim();
          const safeDiet = ALLOWED_DIET_TYPES.has(rawDiet) ? rawDiet : null;
          if (safeDiet && safeDiet !== 'omnivore') {
            query = query.or(`diet_type.eq.${safeDiet},diet_type.is.null`);
          }

          // Cuisine preference
          if (eff.favoriteCuisines && eff.favoriteCuisines.length > 0) {
            query = query.in("cuisine_type", eff.favoriteCuisines);
          }

          // Difficulty level
          if (eff.cookingLevel) {
            const difficultyMap: Record<string, string> = {
              "Débutant": "beginner", "debutant": "beginner",
              "Intermédiaire": "intermediate", "intermediaire": "intermediate",
              "Expert": "expert", "avance": "expert",
            };
            const difficulty = difficultyMap[eff.cookingLevel];
            if (difficulty) query = query.eq("difficulty_level", difficulty);
          }

          // Cooking method preference
          const cookMethods = eff.modeCuissonPrefere?.length > 0
            ? eff.modeCuissonPrefere
            : (eff.cookingMethod ? [eff.cookingMethod] : []);
          if (cookMethods.length > 0) {
            const cookingMap: Record<string, string[]> = {
              'Grillé': ['grillé','plancha','barbecue','rôti'], 'grille': ['grillé','plancha','barbecue','rôti'],
              'Mijoté': ['mijoté','ragoût','braisé','curry'], 'mijote': ['mijoté','ragoût','braisé','curry'],
              'Vapeur': ['vapeur'], 'vapeur': ['vapeur'],
              'Cru': ['cru','mariné'], 'cru': ['cru','mariné'],
            };
            const dbMethods: string[] = [];
            for (const pref of cookMethods) {
              const mapped = cookingMap[pref];
              if (mapped) dbMethods.push(...mapped);
            }
            if (dbMethods.length > 0) {
              const orFilter = dbMethods.map(m => `cooking_method.cs.{${m}}`).join(',');
              query = query.or(orFilter);
            }
          }

          // Salt level
          if (eff.niveauSel) {
            const sel = eff.niveauSel.toLowerCase();
            if (sel === 'sans sel') query = query.eq("salt_level", "bas");
            else if (sel === 'peu salé') query = query.in("salt_level", ["bas", "normal"]);
          }

          // High fiber
          if (eff.trackFiber === true) {
            query = query.not("ingredients_text", "ilike", "%-")
              .or("ingredient_keywords.cs.{high_fiber},ingredients_text.ilike.%légumineuse%,ingredients_text.ilike.%lentille%,ingredients_text.ilike.%haricot%,ingredients_text.ilike.%quinoa%");
          }

          // Macro distribution
          if (eff.macrosCustom && eff.macroCarbsPct < 30) {
            query = query.lte("carbs_g", 35);
          } else if (eff.repartitionMacros) {
            const macros = eff.repartitionMacros.toLowerCase();
            if (macros === 'pauvre en glucides' || macros === 'low carb') query = query.lte("carbs_g", 35);
            else if (macros === 'riche en protéines') query = query.gte("proteins_g", 25);
          }

          // Calorie objective alignment from mainGoal
          if (!eff.targetKcal && !eff.objectifCalorique && eff.mainGoal) {
            const obj = eff.mainGoal.toLowerCase();
            if (obj.includes('perte') || obj.includes('poids')) query = query.lte("calories_kcal", 550);
            else if (obj.includes('muscle') || obj.includes('prise')) query = query.gte("calories_kcal", 450);
          }

          // Limit added sugar
          if (eff.reduceSugar === true) {
            query = query.not("ingredients_text", "ilike", "%sucre ajouté%");
            query = query.not("ingredients_text", "ilike", "%sirop%");
          }
        }
        
        // F1: Widen time constraints
        else if (fallbackLevel === 1) {
          if (firstPrepTime) {
            let maxPrepTime = 60;
            if (firstPrepTime === "<10 min" || firstPrepTime === '15min') maxPrepTime = 25;
            else if (firstPrepTime === "10-20 min" || firstPrepTime === '15_30min') maxPrepTime = 40;
            else if (firstPrepTime === "20-40 min" || firstPrepTime === '30_45min') maxPrepTime = 55;
            query = query.lte("prep_time_min", maxPrepTime);

            let maxTotalTime = 90;
            if (firstPrepTime === "<10 min" || firstPrepTime === '15min') maxTotalTime = 35;
            else if (firstPrepTime === "10-20 min" || firstPrepTime === '15_30min') maxTotalTime = 50;
            else if (firstPrepTime === "20-40 min" || firstPrepTime === '30_45min') maxTotalTime = 75;
            query = query.lte("total_time_min", maxTotalTime);
          }

          const rawDietF1 = (eff.dietType ?? '').toLowerCase().trim();
          const safeDietF1 = ALLOWED_DIET_TYPES.has(rawDietF1) ? rawDietF1 : null;
          if (safeDietF1 && safeDietF1 !== 'omnivore') {
            query = query.or(`diet_type.eq.${safeDietF1},diet_type.is.null`);
          }
        }
        
        // F2: Ignore diet tags
        else if (fallbackLevel === 2) {
          console.log(`[generate-menu] F2: Ignoring diet type filter`);
          if (firstPrepTime) {
            let maxPrepTime = 60;
            if (firstPrepTime === "<10 min" || firstPrepTime === '15min') maxPrepTime = 25;
            else if (firstPrepTime === "10-20 min" || firstPrepTime === '15_30min') maxPrepTime = 40;
            else if (firstPrepTime === "20-40 min" || firstPrepTime === '30_45min') maxPrepTime = 55;
            query = query.lte("prep_time_min", maxPrepTime);
          }
        }
        
        // F3: Ignore cuisines, courses, meal types
        else if (fallbackLevel === 3) {
          console.log(`[generate-menu] F3: Ignoring cuisine, course, and meal type filters`);
        }
        
        // F4: Last resort
        else if (fallbackLevel === 4) {
          console.log(`[generate-menu] F4: Last resort — published recipes only with mandatory exclusions`);
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
        { headers: { ...corsHeaders, ...getSecurityHeaders(), "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Number of slots needed: if meals_per_day=1, only dinner; if 2, lunch+dinner
    const totalSlots = mealsPerDay === 1 ? 7 : 14;
    const shuffled = [...recipes].sort(() => Math.random() - 0.5);
    let selectedRecipes = shuffled.slice(0, Math.min(totalSlots, recipes.length));

    while (selectedRecipes.length < totalSlots) {
      const nextIndex = selectedRecipes.length % shuffled.length;
      selectedRecipes.push(shuffled[nextIndex]);
    }

    // If 1 meal/day: only dinner. If 2 meals/day: lunch + dinner
    const lunchRecipes = mealsPerDay === 1 ? [] : selectedRecipes.slice(0, 7);
    const dinnerRecipes = mealsPerDay === 1 ? selectedRecipes.slice(0, 7) : selectedRecipes.slice(7, 14);

    // ============================================================
    // POST-SELECTION VALIDATION (Defense in Depth)
    // Double-check that NO selected recipe violates restrictions
    // Validate ALL recipes (both lunch and dinner)
    // ============================================================
    const allSelectedRecipes = [...lunchRecipes, ...dinnerRecipes].filter(Boolean);
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
          { headers: { ...corsHeaders, ...getSecurityHeaders(), "Content-Type": "application/json" }, status: 200 }
        );
      }
    }

    console.log(`[generate-menu] ✅ POST-VALIDATION PASSED: All ${lunchRecipes.length + dinnerRecipes.length} recipes are safe`);
    console.log(`[generate-menu] Lunch recipes: ${lunchRecipes.map((r: any) => r.title).join(", ")}`);
    console.log(`[generate-menu] Dinner recipes: ${dinnerRecipes.map((r: any) => r.title).join(", ")}`);


    // Build weekly menu with per-meal portion factors
    const weekdays = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
    
    // Helper to build a meal entry with per-meal portions
    const buildMealEntry = (recipe: any, dayIndex: number, mealType: 'lunch' | 'dinner') => {
      const recipeServings = recipe.servings || 1;
      // Use per-meal portions from user_meals_config if available
      const mealPortions = mealType === 'lunch' ? lunchPortions : dinnerPortions;
      const portionFactor = mealPortions / recipeServings;
      
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
        servings_used: Math.max(1, Math.round(mealPortions)),
        base_servings: recipeServings,
        generate_recipe: mealType === 'lunch' ? generateLunch : generateDinner,
      };
    };
    
    // Build days: skip recipe generation for meals where generate_recipe=false
    const days = weekdays.map((dayName, index) => {
      const dinnerRecipe = dinnerRecipes[index];
      const entry: any = { day: dayName };
      
      if (generateDinner && dinnerRecipe) {
        entry.dinner = buildMealEntry(dinnerRecipe, index, 'dinner');
      } else {
        entry.dinner = { skip: true, reason: dinnerConfig?.location || 'restaurant' };
      }
      
      if (mealsPerDay >= 2 && lunchRecipes[index]) {
        if (generateLunch) {
          entry.lunch = buildMealEntry(lunchRecipes[index], index, 'lunch');
        } else {
          entry.lunch = { skip: true, reason: lunchConfig?.location || 'restaurant' };
        }
      }
      return entry;
    });

    console.log(`[generate-menu] Upserting menu for week starting: ${weekStartStr}`);

    const { data: menu, error: menuError } = await supabaseClient
      .from("user_weekly_menus")
      .upsert({
        user_id: user.id,
        week_start: weekStartStr,
        payload: { 
          days,
          household: {
            adults: eff.householdAdults,
            children: eff.householdChildren,
            children_ages: eff.childrenAges,
            effective_size: effectiveHouseholdSize
          },
          medical_conditions: eff.medicalConditions,
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
      
      // Add lunch item only if meals_per_day >= 2
      if (mealsPerDay >= 2 && day.lunch) {
        menuItems.push({
          weekly_menu_id: menu.menu_id,
          recipe_id: day.lunch.recipe_id,
          day_of_week: dayOfWeek,
          meal_slot: 'lunch',
          target_servings: day.lunch.servings_used,
          scale_factor: day.lunch.portion_factor,
          portion_factor: day.lunch.portion_factor
        });
      }
      
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
      throw new Error("Failed to save menu items");
    } else {
      console.log(`[generate-menu] Inserted ${menuItems.length} menu items for shopping list generation`);
    }

    // ========================================
    // ALSO populate user_daily_recipes table
    // This is what the dashboard RPC reads from
    // ========================================
    console.log(`[generate-menu] Populating user_daily_recipes table for dashboard...`);
    
    // Delete existing entries for this week
    // Calculate end of week reliably
    const weekEndDate = new Date(weekStartStr + 'T00:00:00Z');
    weekEndDate.setUTCDate(weekEndDate.getUTCDate() + 7);
    const weekEndStr = weekEndDate.toISOString().split('T')[0];
    const { error: deleteRecipesError } = await supabaseClient
      .from("user_daily_recipes")
      .delete()
      .eq("user_id", user.id)
      .gte("date", weekStartStr)
      .lte("date", weekEndStr); // inclusive to catch Sunday

    if (deleteRecipesError) {
      console.error("[generate-menu] Error deleting old daily recipes:", deleteRecipesError);
    }

    // Insert one row per day into user_daily_recipes
    const dailyRecipes = days.map((day, index) => {
      const dayDate = new Date(weekStartStr + 'T00:00:00Z');
      dayDate.setUTCDate(dayDate.getUTCDate() + index);
      return {
        user_id: user.id,
        date: dayDate.toISOString().split('T')[0],
        lunch_recipe_id: (mealsPerDay >= 2 && day.lunch) ? day.lunch.recipe_id : null,
        dinner_recipe_id: day.dinner.recipe_id,
      };
    });

    const { error: dailyRecipesError } = await supabaseClient
      .from("user_daily_recipes")
      .upsert(dailyRecipes, { onConflict: 'user_id,date' });

    if (dailyRecipesError) {
      console.error("[generate-menu] Error upserting daily recipes:", dailyRecipesError);
      throw new Error("Failed to save daily recipes");
    } else {
      console.log(`[generate-menu] Inserted ${dailyRecipes.length} daily recipe entries for dashboard`);
    }

    console.log(`[generate-menu] ✅ SUCCESS: Generated menu ${menu.menu_id} with ${usedFallback || 'strict filters'}`);

    // ── SUCCESS: Now deduct credits atomically ──
    console.log(`[generate-menu] Deducting ${menuCost} credits after successful generation (feature=${menuFeatureKey})`);
    const { data: creditsCheck, error: creditsError } = await supabaseClient.rpc('check_and_consume_credits', {
      p_user_id: user.id,
      p_feature: menuFeatureKey,
      p_cost: menuCost,
    });

    if (creditsError) {
      console.error('[generate-menu] Credits deduction error after success:', creditsError);
      // Still return the successful menu
    } else {
      console.log(`[generate-menu] ✅ ${menuCost} credits consumed. New balance: ${creditsCheck?.new_balance}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        days, 
        menu_id: menu.menu_id,
        week_start: weekStartStr,
        usedFallback: usedFallback,
        fallbackLevel: fallbackLevel
      }),
      { headers: { ...corsHeaders, ...getSecurityHeaders(), "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[generate-menu] Error:", error);
    await logEdgeFunctionError('generate-menu', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, ...getSecurityHeaders(), "Content-Type": "application/json" }, status: 400 }
    );
  }
});
