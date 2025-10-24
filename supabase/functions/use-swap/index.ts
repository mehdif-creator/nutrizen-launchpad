import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

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
const UseSwapSchema = z.object({
  meal_plan_id: z.string().uuid({ message: "Invalid meal_plan_id format" }),
  day: z.number().int().min(0).max(6, { message: "Day must be between 0 and 6" }),
}).strict()

serve(async (req) => {
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

    // Parse and validate input
    const body = await req.json()
    const validatedInput = UseSwapSchema.parse(body)

    // Get current month
    const currentMonth = new Date().toISOString().slice(0, 7) + '-01'

    // Call atomic function to use swap
    const { data: swapData, error: swapError } = await supabaseClient.rpc('use_swap_atomic', {
      p_user_id: user.id,
      p_month: currentMonth,
      p_meal_plan_id: validatedInput.meal_plan_id,
      p_day: validatedInput.day,
    })

    if (swapError) {
      console.error('Error using swap:', swapError)
      return new Response(
        JSON.stringify({ 
          success: false,
          error: swapError.message || 'Quota épuisé ou invalide' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[use-swap] Swap deducted successfully, now swapping recipe...')

    // Get the current menu
    const { data: menuData, error: menuError } = await supabaseClient
      .from('user_weekly_menus')
      .select('*')
      .eq('menu_id', validatedInput.meal_plan_id)
      .single()

    if (menuError || !menuData) {
      console.error('Error fetching menu:', menuError)
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Menu introuvable' 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user preferences for filtering
    const { data: preferences } = await supabaseClient
      .from('preferences')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // Build query for a replacement recipe
    let recipeQuery = supabaseClient
      .from('recipes')
      .select('id, title, prep_time_min, calories_kcal, image_url')
      .eq('published', true)

    // Apply user exclusions
    if (preferences?.allergies && Array.isArray(preferences.allergies) && preferences.allergies.length > 0) {
      const allergenMap: Record<string, string> = {
        "Gluten": "gluten",
        "Lactose": "lactose",
        "Fruits à coque": "nuts",
        "Arachide": "peanuts",
        "Œufs": "eggs",
        "Fruits de mer": "shellfish",
        "Soja": "soy",
        "Sésame": "sesame"
      }
      const userAllergens = preferences.allergies.map((a: string) => allergenMap[a] || a.toLowerCase())
      recipeQuery = recipeQuery.not('allergens', 'cs', `{${userAllergens.join(',')}}`)
    }

    if (preferences?.aliments_eviter && Array.isArray(preferences.aliments_eviter) && preferences.aliments_eviter.length > 0) {
      const cleanedExclusions = preferences.aliments_eviter
        .map((ing: string) => (ing || '').trim())
        .filter((ing: string) => ing.length > 0)
      
      if (cleanedExclusions.length > 0) {
        cleanedExclusions.forEach((ing: string) => {
          recipeQuery = recipeQuery.not('ingredients_text', 'ilike', `%${ing}%`)
        })
      }
    }

    // Get current recipe IDs to avoid duplicates
    const currentRecipeIds = menuData.payload.days.map((d: any) => d.recipe_id)
    recipeQuery = recipeQuery.not('id', 'in', `(${currentRecipeIds.join(',')})`)

    // Fetch potential replacement recipes
    const { data: recipes, error: recipesError } = await recipeQuery.limit(20)

    if (recipesError || !recipes || recipes.length === 0) {
      console.error('Error fetching recipes:', recipesError)
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Aucune recette de remplacement disponible' 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Pick a random recipe
    const randomRecipe = recipes[Math.floor(Math.random() * recipes.length)]

    // Update the menu with the new recipe
    const updatedDays = [...menuData.payload.days]
    updatedDays[validatedInput.day] = {
      recipe_id: randomRecipe.id,
      title: randomRecipe.title,
      prep_min: randomRecipe.prep_time_min || 0,
      calories: randomRecipe.calories_kcal || 0,
      image_url: randomRecipe.image_url
    }

    const { error: updateError } = await supabaseClient
      .from('user_weekly_menus')
      .update({
        payload: { days: updatedDays },
        updated_at: new Date().toISOString()
      })
      .eq('menu_id', validatedInput.meal_plan_id)

    if (updateError) {
      console.error('Error updating menu:', updateError)
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Erreur lors de la mise à jour du menu' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[use-swap] Recipe swapped successfully!')

    return new Response(
      JSON.stringify({
        success: true,
        swapsRemaining: swapData.remaining,
        newRecipe: {
          id: randomRecipe.id,
          title: randomRecipe.title
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in use-swap:', error)
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ 
          error: 'Validation error',
          details: error.errors
        }),
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
