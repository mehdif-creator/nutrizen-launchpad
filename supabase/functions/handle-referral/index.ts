import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[HANDLE-REFERRAL] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { referralCode, newUserId } = await req.json();

    if (!referralCode || !newUserId) {
      throw new Error("Missing referralCode or newUserId");
    }

    logStep("Processing referral", { referralCode, newUserId });

    // Find the referrer by referral code
    const { data: referrerData, error: referrerError } = await supabaseAdmin
      .from('referrals')
      .select('referrer_id, id')
      .eq('referral_code', referralCode)
      .is('referred_id', null)
      .maybeSingle();

    if (referrerError || !referrerData) {
      logStep("Referral code not found or already used", { referralCode });
      return new Response(JSON.stringify({ 
        success: false, 
        message: "Invalid or already used referral code" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const referrerId = referrerData.referrer_id;
    logStep("Found referrer", { referrerId });

    // Update the referral record to link the new user
    const { error: updateError } = await supabaseAdmin
      .from('referrals')
      .update({
        referred_id: newUserId,
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', referrerData.id);

    if (updateError) {
      throw updateError;
    }

    logStep("Referral updated successfully");

    // Award points to the referrer
    const { data: userPoints, error: pointsError } = await supabaseAdmin
      .from('user_points')
      .select('*')
      .eq('user_id', referrerId)
      .maybeSingle();

    if (pointsError && pointsError.code !== 'PGRST116') {
      console.error("Error fetching user points:", pointsError);
    } else {
      const pointsToAward = 5;
      const newTotalPoints = (userPoints?.total_points || 0) + pointsToAward;
      const newLevel = calculateLevel(newTotalPoints);

      if (!userPoints) {
        // Create new points record
        await supabaseAdmin
          .from('user_points')
          .insert({
            user_id: referrerId,
            total_points: pointsToAward,
            current_level: newLevel,
            referrals: 1,
          });
      } else {
        // Update existing record
        await supabaseAdmin
          .from('user_points')
          .update({
            total_points: newTotalPoints,
            current_level: newLevel,
            referrals: userPoints.referrals + 1,
          })
          .eq('user_id', referrerId);
      }

      logStep("Points awarded to referrer", { referrerId, pointsAwarded: pointsToAward });
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: "Referral processed successfully"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

function calculateLevel(points: number): string {
  if (points >= 300) return 'Platinum';
  if (points >= 150) return 'Gold';
  if (points >= 50) return 'Silver';
  return 'Bronze';
}
