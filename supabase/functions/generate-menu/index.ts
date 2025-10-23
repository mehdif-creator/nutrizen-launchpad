import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // Get user preferences
    const { data: preferences, error: prefError } = await supabaseClient
      .from("preferences")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (prefError && prefError.code !== "PGRST116") {
      console.error("Error fetching preferences:", prefError);
    }

    // Helper function to build query with filters
    const buildRecipeQuery = (
      relaxedTime = false,
      ignoreDiet = false,
      useGenericPool = false
    ) => {
      let query = supabaseClient
        .from("recipes")
        .select("id, title, prep_time_min, total_time_min, calories_kcal, proteins_g, carbs_g, fats_g, cuisine_type, meal_type, diet_type, allergens, difficulty_level")
        .eq("published", true);

      if (useGenericPool) {
        // Generic safe pool: quick, common recipes
        query = query.or("meal_type.eq.lunch,meal_type.eq.dinner");
      }

      if (preferences) {
        // ALWAYS enforce allergens/exclusions
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
        }

        // Filter by prep time (relax if needed)
        if (preferences.temps_preparation && !useGenericPool) {
          let maxPrepTime = 60;
          if (preferences.temps_preparation === "<10 min") {
            maxPrepTime = relaxedTime ? 20 : 10;
          } else if (preferences.temps_preparation === "10-20 min") {
            maxPrepTime = relaxedTime ? 30 : 20;
          } else if (preferences.temps_preparation === "20-40 min") {
            maxPrepTime = relaxedTime ? 50 : 40;
          }
          query = query.lte("prep_time_min", maxPrepTime);
        }

        // Filter by diet type (can be ignored in fallback)
        if (!ignoreDiet && preferences.type_alimentation && preferences.type_alimentation !== "Omnivore") {
          query = query.eq("diet_type", preferences.type_alimentation.toLowerCase());
        }

        // Filter by difficulty level
        if (preferences.niveau_cuisine && !useGenericPool) {
          const difficultyMap: Record<string, string> = {
            "Débutant": "beginner",
            "Intermédiaire": "intermediate",
            "Expert": "expert"
          };
          const difficulty = difficultyMap[preferences.niveau_cuisine];
          if (difficulty) {
            query = query.eq("difficulty_level", difficulty);
          }
        }
      }

      return query.limit(100);
    };

    // Fallback ladder strategy
    let recipes: any[] = [];
    let usedFallback = false;
    let fallbackLevel = 0;

    // F0: Strict filters
    const { data: strictRecipes } = await buildRecipeQuery(false, false, false);
    if (strictRecipes && strictRecipes.length >= 7) {
      recipes = strictRecipes;
    } else {
      console.log("F0 yielded", strictRecipes?.length || 0, "recipes. Trying F1...");
      usedFallback = true;
      fallbackLevel = 1;

      // F1: Relax time constraints
      const { data: relaxedTimeRecipes } = await buildRecipeQuery(true, false, false);
      if (relaxedTimeRecipes && relaxedTimeRecipes.length >= 7) {
        recipes = relaxedTimeRecipes;
      } else {
        console.log("F1 yielded", relaxedTimeRecipes?.length || 0, "recipes. Trying F2...");
        fallbackLevel = 2;

        // F2: Ignore diet tags but keep allergens
        const { data: ignoreDietRecipes } = await buildRecipeQuery(true, true, false);
        if (ignoreDietRecipes && ignoreDietRecipes.length >= 7) {
          recipes = ignoreDietRecipes;
        } else {
          console.log("F2 yielded", ignoreDietRecipes?.length || 0, "recipes. Trying F3...");
          fallbackLevel = 3;

          // F3: Generic safe pool with allergens respected
          const { data: genericRecipes } = await buildRecipeQuery(false, true, true);
          recipes = genericRecipes || [];
        }
      }
    }

    const { error: recipeError } = { error: null };

    if (!recipes || recipes.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Aucune recette trouvée. Contactez le support.",
          usedFallback: false
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Select 7 distinct recipes for the week
    const shuffled = [...recipes].sort(() => Math.random() - 0.5);
    const selectedRecipes = shuffled.slice(0, Math.min(7, recipes.length));

    // Fill remaining days if less than 7 recipes available
    while (selectedRecipes.length < 7) {
      selectedRecipes.push(shuffled[selectedRecipes.length % shuffled.length]);
    }

    // Build weekly menu
    const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const days = selectedRecipes.map((recipe, index) => ({
      day: weekdays[index],
      recipe_id: recipe.id,
      title: recipe.title,
      prep_min: recipe.prep_time_min || 0,
      total_min: recipe.total_time_min || 0,
      calories: recipe.calories_kcal || 0,
      macros: {
        proteins_g: recipe.proteins_g || 0,
        carbs_g: recipe.carbs_g || 0,
        fats_g: recipe.fats_g || 0
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
      console.error("Error upserting menu:", menuError);
      throw new Error("Failed to save menu");
    }

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
    console.error("Error in generate-menu function:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
