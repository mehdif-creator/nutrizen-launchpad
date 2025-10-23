import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation schema
const GenerateMenuSchema = z.object({
  week_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
}).strict();

serve(async (req) => {
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

    console.log(`[generate-menu] Processing request for user: ${user.id}`);

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

      console.log(`[generate-menu] Building query for fallback level: ${fallbackLevel}`);

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

        // ALWAYS enforce excluded ingredients (only if ingredients_text is not null)
        if (preferences.aliments_eviter && Array.isArray(preferences.aliments_eviter) && preferences.aliments_eviter.length > 0) {
          // For each excluded ingredient, filter out recipes containing it (skip if ingredients_text is null)
          preferences.aliments_eviter.forEach((ing: string) => {
            query = query.or(`ingredients_text.is.null,not.ingredients_text.ilike.%${ing}%`);
          });
          console.log(`[generate-menu] Enforcing ingredient exclusions: ${preferences.aliments_eviter.join(", ")}`);
        }

        // ALWAYS enforce appliance constraints
        if (preferences.appliances_owned && Array.isArray(preferences.appliances_owned)) {
          const ownedAppliances = preferences.appliances_owned;
          
          // If user doesn't own airfryer, exclude airfryer recipes
          if (!ownedAppliances.includes('airfryer')) {
            query = query.not("appliances", "cs", "{airfryer}");
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
        
        // F3: Ignore cuisines and courses, use generic pool
        else if (fallbackLevel === 3) {
          console.log(`[generate-menu] F3: Using generic safe pool`);
          // Generic safe pool with common meal types
          query = query.or("meal_type.eq.lunch,meal_type.eq.dinner,meal_type.eq.breakfast");
        }
        
        // F4: Last resort - just apply mandatory filters
        else if (fallbackLevel === 4) {
          console.log(`[generate-menu] F4: Last resort - mandatory filters only`);
          // Only allergens, exclusions, and appliances enforced (already applied above)
        }
      }

      return query.limit(100);
    };

    // Fallback ladder strategy
    let recipes: any[] = [];
    let usedFallback = false;
    let fallbackLevel = 0;

    // Try each fallback level until we get at least 7 recipes
    for (let level = 0; level <= 4; level++) {
      const { data: levelRecipes, error: recipeError } = await buildRecipeQuery(level);
      
      if (recipeError) {
        console.error(`[generate-menu] Error at F${level}:`, recipeError);
        continue;
      }

      console.log(`[generate-menu] F${level} yielded ${levelRecipes?.length || 0} recipes`);

      if (levelRecipes && levelRecipes.length >= 7) {
        recipes = levelRecipes;
        fallbackLevel = level;
        usedFallback = level > 0;
        break;
      }
      
      // If we have some recipes but not enough, save them and continue
      if (levelRecipes && levelRecipes.length > recipes.length) {
        recipes = levelRecipes;
        fallbackLevel = level;
        usedFallback = level > 0;
      }
    }

    if (!recipes || recipes.length === 0) {
      console.error("[generate-menu] No recipes found after all fallback attempts");
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Aucune recette trouvée correspondant à tes critères. Contacte le support.",
          usedFallback: false
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

    // Upsert weekly menu
    const { data: menu, error: menuError } = await supabaseClient
      .from("user_weekly_menus")
      .upsert({
        user_id: user.id,
        week_start: weekStartStr,
        payload: { days }
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

    return new Response(
      JSON.stringify({ 
        success: true, 
        days, 
        menu_id: menu.menu_id,
        week_start: weekStartStr,
        usedFallback,
        fallbackLevel
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
