import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { getCorsHeaders } from '../_shared/security.ts';
import { PublicError, sanitizeDbError } from '../_shared/errors.ts';
import { createLogger } from '../_shared/logging.ts';

// Input validation schema
const HandleReferralSchema = z.object({
  referralCode: z.string()
    .trim()
    .min(1, { message: 'Referral code is required' })
    .max(50, { message: 'Referral code too long' })
    .regex(/^[a-zA-Z0-9_-]+$/, { message: 'Invalid referral code format' }),
  newUserId: z.string().uuid({ message: 'Invalid newUserId format' }),
}).strict();

function calculateLevel(points: number): string {
  if (points >= 300) return 'Platinum';
  if (points >= 150) return 'Gold';
  if (points >= 50) return 'Silver';
  return 'Bronze';
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  const logger = createLogger('handle-referral');

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    logger.info('Function started');

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Parse and validate input
    const body = await req.json();
    const parseResult = HandleReferralSchema.safeParse(body);
    
    if (!parseResult.success) {
      const errorMessage = parseResult.error.errors
        .map(e => `${e.path.join('.')}: ${e.message}`)
        .join(', ');
      throw new PublicError({
        code: 'VALIDATION_ERROR',
        userMessage: 'Invalid input data',
        statusCode: 400,
        internalDetails: { errors: parseResult.error.errors }
      });
    }
    
    const { referralCode, newUserId } = parseResult.data;

    logger.info('Processing referral', { referralCode });

    // Find the referrer by referral code
    const { data: referrerData, error: referrerError } = await supabaseAdmin
      .from('referrals')
      .select('referrer_id, id')
      .eq('referral_code', referralCode)
      .is('referred_id', null)
      .maybeSingle();

    if (referrerError) {
      throw sanitizeDbError(referrerError, { operation: 'find_referrer' });
    }

    if (!referrerData) {
      logger.info('Referral code not found or already used');
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Code de parrainage invalide ou déjà utilisé' 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const referrerId = referrerData.referrer_id;
    logger.info('Found referrer');

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
      throw sanitizeDbError(updateError, { operation: 'update_referral' });
    }

    logger.info('Referral updated successfully');

    // Award points to the referrer
    const { data: userPoints, error: pointsError } = await supabaseAdmin
      .from('user_points')
      .select('*')
      .eq('user_id', referrerId)
      .maybeSingle();

    if (pointsError && pointsError.code !== 'PGRST116') {
      logger.error('Error fetching user points', pointsError);
      // Don't fail - referral was recorded, points can be handled separately
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

      logger.info('Points awarded to referrer', { pointsAwarded: pointsToAward });
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Parrainage traité avec succès'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorDetails = error instanceof Error 
      ? { message: error.message, stack: error.stack }
      : { message: String(error) };
    logger.error('Operation failed', errorDetails);

    // Handle PublicError instances
    if (error instanceof PublicError) {
      return error.toResponse(corsHeaders);
    }
    
    // Return sanitized generic error
    return new PublicError({
      code: 'INTERNAL_ERROR',
      userMessage: 'Une erreur est survenue. Veuillez réessayer.',
      statusCode: 500,
      internalDetails: error
    }).toResponse(corsHeaders);
  }
});
