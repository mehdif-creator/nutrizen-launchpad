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

    // Build recipe filters based on preferences
    let query = supabaseClient
      .from("recipes")
      .select("id, title, prep_time_min, total_time_min, calories_kcal, proteins_g, carbs_g, fats_g, cuisine_type, meal_type, diet_type, allergens, difficulty_level")
      .eq("published", true);

    if (preferences) {
      // Filter by prep time
      if (preferences.temps_preparation === "<10 min") {
        query = query.lte("prep_time_min", 10);
      } else if (preferences.temps_preparation === "10-20 min") {
        query = query.lte("prep_time_min", 20);
      } else if (preferences.temps_preparation === "20-40 min") {
        query = query.lte("prep_time_min", 40);
      }

      // Filter by diet type
      if (preferences.type_alimentation && preferences.type_alimentation !== "Omnivore") {
        query = query.eq("diet_type", preferences.type_alimentation.toLowerCase());
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
        }
      }

      // Exclude allergens
      if (preferences.allergies && Array.isArray(preferences.allergies) && preferences.allergies.length > 0) {
        // For each allergen, we need to ensure the recipe doesn't contain it
        // This is a PostgreSQL array query - recipes where allergens array doesn't overlap with user's allergies
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
        // Use not filter to exclude recipes with these allergens
        query = query.not("allergens", "cs", `{${userAllergens.join(",")}}`);
      }
    }

    // Limit to 50 recipes
    query = query.limit(50);

    const { data: recipes, error: recipeError } = await query;

    if (recipeError) {
      console.error("Error fetching recipes:", recipeError);
      throw new Error("Failed to fetch recipes");
    }

    if (!recipes || recipes.length === 0) {
      // Return empty menu if no recipes found
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "No recipes found matching your preferences. Try adjusting your filters." 
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
        week_start: weekStartStr
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
