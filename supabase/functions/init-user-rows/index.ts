import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation schema
const InitUserSchema = z.object({
  user_id: z.string().uuid({ message: "Invalid user_id format" }),
});

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    // Parse and validate input
    const body = await req.json();
    const validatedInput = InitUserSchema.parse(body);

    console.log(`[init-user-rows] Initializing rows for user: ${validatedInput.user_id}`);

    // Verify the requesting user matches the user_id (or is admin)
    if (user.id !== validatedInput.user_id) {
      // Check if user is admin
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (!roles || roles.role !== "admin") {
        throw new Error("Unauthorized: Can only initialize your own rows");
      }
    }

    // Initialize user_dashboard_stats
    const { error: statsError } = await supabase
      .from("user_dashboard_stats")
      .upsert({
        user_id: validatedInput.user_id,
        temps_gagne: 0,
        charge_mentale_pct: 0,
        serie_en_cours_set_count: 0,
        credits_zen: 10,
        references_count: 0,
        objectif_hebdos_valide: 0,
      }, {
        onConflict: "user_id"
      });

    if (statsError) {
      console.error("[init-user-rows] Error initializing dashboard stats:", statsError);
      throw new Error(`Failed to initialize dashboard stats: ${statsError.message}`);
    }

    // Initialize user_gamification
    const { error: gamificationError } = await supabase
      .from("user_gamification")
      .upsert({
        user_id: validatedInput.user_id,
        points: 0,
        level: 1,
        streak_days: 0,
        badges_count: 0,
      }, {
        onConflict: "user_id"
      });

    if (gamificationError) {
      console.error("[init-user-rows] Error initializing gamification:", gamificationError);
      throw new Error(`Failed to initialize gamification: ${gamificationError.message}`);
    }

    // Initialize user_points
    const { error: pointsError } = await supabase
      .from("user_points")
      .upsert({
        user_id: validatedInput.user_id,
        total_points: 0,
        current_level: "Bronze",
        login_streak: 0,
        meals_completed: 0,
        meals_generated: 0,
        referrals: 0,
      }, {
        onConflict: "user_id"
      });

    if (pointsError) {
      console.error("[init-user-rows] Error initializing points:", pointsError);
      throw new Error(`Failed to initialize points: ${pointsError.message}`);
    }

    console.log(`[init-user-rows] Successfully initialized all rows for user: ${validatedInput.user_id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "User rows initialized successfully",
        user_id: validatedInput.user_id
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );

  } catch (error) {
    console.error("[init-user-rows] Error:", error);
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ 
          error: "Validation error",
          details: error.errors
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400
        }
      );
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const statusCode = errorMessage.includes("Unauthorized") ? 403 : 
                       errorMessage.includes("Invalid") ? 401 : 500;

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: statusCode
      }
    );
  }
});
