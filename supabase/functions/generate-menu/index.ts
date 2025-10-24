import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
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

serve(async (req) => {
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

    // Deduct 7 credits for week regeneration
    const currentMonth = new Date().toISOString().slice(0, 7) + '-01';
    const { data: creditData, error: creditError } = await supabaseClient.rpc('deduct_week_regeneration_credits', {
      p_user_id: user.id,
      p_month: currentMonth,
    });

    if (creditError) {
      console.error('[generate-menu] Error deducting credits:', creditError);
      return new Response(
        JSON.stringify({ 
          success: false,
          message: creditError.message || 'Crédits insuffisants pour régénérer la semaine.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[generate-menu] Credits deducted: ${creditData.credits_deducted}, remaining: ${creditData.remaining}`);

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

    // Helper function to check if ingredient text contains excluded items
    const buildExclusionCheck = (excludedIngredients: string[]) => {
      if (!excludedIngredients || excludedIngredients.length === 0) return null;
      
      // Build a query that checks ingredients_text for any excluded ingredient
      return excludedIngredients.map(ing => `ingredients_text.not.ilike.%${ing}%`).join(',');
    };

    // Helper function to build query with filters
    const buildRecipeQuery = (
      fallbackLevel = 0
    ) => {
      let query = supabaseClient
        .from("recipes")
        .select("id, title, prep_time_min, total_time_min, calories_kcal, proteins_g, carbs_g, fats_g, cuisine_type, meal_type, diet_type, allergens, difficulty_level, appliances, image_url, image_path, ingredients_text")
        .eq("published", true);

      console.log(`[generate-menu] Building query for fallback level: F${fallbackLevel}`);

      if (preferences) {
        // ALWAYS enforce allergens/exclusions at every fallback level
        if (preferences.allergies && Array.isArray(preferences.allergies) && preferences.allergies.length > 0) {
          const allergenMap: Record<string, string> = {
            "Gluten": "gluten",
            "Lactose": "lactose",
            "Fruits à coque": "nuts",
            "Arachide": "peanuts",
            "Œufs": "eggs",
            "Fruits de mer": "shellfish",
            "Soja": "soy",
            "Sésame": "sesame"
          };
          const userAllergens = preferences.allergies.map((a: string) => allergenMap[a] || a.toLowerCase());
          query = query.not("allergens", "cs", `{${userAllergens.join(",")}}`);
          console.log(`[generate-menu] Enforcing allergen exclusions: ${userAllergens.join(", ")}`);
        }

        // ALWAYS enforce excluded ingredients (but allow recipes with no ingredients_text)
        if (preferences.aliments_eviter && Array.isArray(preferences.aliments_eviter) && preferences.aliments_eviter.length > 0) {
          // Clean up ingredients (trim spaces) and filter non-empty ones
          const cleanedExclusions = preferences.aliments_eviter
            .map((ing: string) => (ing || '').trim())
            .filter((ing: string) => ing.length > 0);
          
          if (cleanedExclusions.length > 0) {
            // Build a condition that allows null/empty OR doesn't contain any excluded ingredient
            // For each ingredient, we want: NOT ILIKE '%ingredient%'
            cleanedExclusions.forEach((ing: string) => {
              // Simple negative filter - if ingredients_text contains this, exclude it
              query = query.not("ingredients_text", "ilike", `%${ing}%`);
            });
            console.log(`[generate-menu] Enforcing ingredient exclusions: ${cleanedExclusions.join(", ")}`);
          }
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

      const recipeCount = levelRecipes?.length || 0;
      console.log(`[generate-menu] F${level} yielded ${recipeCount} recipes`);

      if (levelRecipes && recipeCount >= 7) {
        recipes = levelRecipes;
        fallbackLevel = level;
        usedFallback = level > 0 ? `F${level}` : null;
        console.log(`[generate-menu] SUCCESS: Using F${level} with ${recipeCount} candidates`);
        break;
      }
      
      // If we have some recipes but not enough, save them and continue
      if (levelRecipes && recipeCount > recipes.length) {
        recipes = levelRecipes;
        fallbackLevel = level;
        usedFallback = `F${level}`;
        console.log(`[generate-menu] F${level} has ${recipeCount} recipes, continuing to next level...`);
      }
    }

    if (!recipes || recipes.length === 0) {
      console.error("[generate-menu] CRITICAL: No recipes found after all fallback attempts (F0-F4)");
      console.error("[generate-menu] Total published recipes in DB:", await supabaseClient.from("recipes").select("id", { count: "exact", head: true }));
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Aucune recette disponible dans la base de données. Contacte le support.",
          usedFallback: null,
          error: "NO_RECIPES_IN_DB"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Select 7 distinct recipes for the week
    const shuffled = [...recipes].sort(() => Math.random() - 0.5);
    const selectedRecipes = shuffled.slice(0, Math.min(7, recipes.length));

    // Fill remaining days if less than 7 recipes available (allow repeats)
    while (selectedRecipes.length < 7) {
      const nextIndex = selectedRecipes.length % shuffled.length;
      selectedRecipes.push(shuffled[nextIndex]);
    }

    console.log(`[generate-menu] Selected ${selectedRecipes.length} recipes for the week`);

    // Build weekly menu
    const weekdays = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
    const days = selectedRecipes.map((recipe, index) => ({
      day: weekdays[index],
      recipe_id: recipe.id,
      title: recipe.title,
      image_url: recipe.image_url || recipe.image_path || null,
      prep_min: recipe.prep_time_min || 0,
      total_min: recipe.total_time_min || 0,
      calories: Math.round(recipe.calories_kcal || 0),
      macros: {
        proteins_g: Math.round(recipe.proteins_g || 0),
        carbs_g: Math.round(recipe.carbs_g || 0),
        fats_g: Math.round(recipe.fats_g || 0)
      }
    }));

    // Get current week start (Monday)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust to Monday
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + diff);
    weekStart.setHours(0, 0, 0, 0);
    const weekStartStr = weekStart.toISOString().split('T')[0];

    console.log(`[generate-menu] Upserting menu for week starting: ${weekStartStr}`);

    // Upsert weekly menu with fallback tracking
    const { data: menu, error: menuError } = await supabaseClient
      .from("user_weekly_menus")
      .upsert({
        user_id: user.id,
        week_start: weekStartStr,
        payload: { days },
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
