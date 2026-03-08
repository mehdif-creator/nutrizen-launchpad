import { createClient } from '../_shared/deps.ts';
import { getCorsHeaders } from '../_shared/security.ts';

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const { recipeId, durationMinutes, dayCompleted } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    let totalPoints = 0;
    const messages: string[] = [];

    // Award +3 points for meal validation via V2 unified system
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' });
    const { data: mealResult } = await supabaseClient.rpc('fn_emit_gamification_event', {
      p_event_type: 'MEAL_VALIDATED',
      p_meta: { recipeId, durationMinutes },
      p_idempotency_key: `meal:${user.id}:${recipeId}:${today}`,
    });

    if (mealResult?.success) {
      totalPoints += mealResult.points_awarded || 3;
      messages.push(`+${mealResult.points_awarded || 3} points pour repas validé`);
    }

    // Day completed bonus
    if (dayCompleted) {
      const { data: dayResult } = await supabaseClient.rpc('fn_emit_gamification_event', {
        p_event_type: 'DAY_COMPLETED',
        p_meta: { date: today },
        p_idempotency_key: `day_complete:${user.id}:${today}`,
      });

      if (dayResult?.success) {
        totalPoints += dayResult.points_awarded || 5;
        messages.push(`+${dayResult.points_awarded || 5} bonus journée complète !`);
      }
    }

    // Fast Cook badge check (if under 15 minutes)
    if (durationMinutes && durationMinutes <= 15) {
      const { data: fastCookEvents } = await supabaseClient
        .from('gamification_events')
        .select('id')
        .eq('user_id', user.id)
        .eq('event_type', 'MEAL_VALIDATED')
        .limit(10);

      if (fastCookEvents && fastCookEvents.length >= 10) {
        const { data: hasBadge } = await supabaseClient
          .from('user_badges')
          .select('id')
          .eq('user_id', user.id)
          .eq('badge_code', 'FAST_COOK')
          .maybeSingle();

        if (!hasBadge) {
          await supabaseClient
            .from('user_badges')
            .insert({ user_id: user.id, badge_code: 'FAST_COOK' });
          
          const { data: badgeResult } = await supabaseClient.rpc('fn_emit_gamification_event', {
            p_event_type: 'BADGE_GRANTED',
            p_meta: { badge: 'FAST_COOK' },
            p_idempotency_key: `badge:${user.id}:FAST_COOK`,
          });

          if (badgeResult?.success) {
            totalPoints += badgeResult.points_awarded || 10;
            messages.push('🎉 Badge Fast Cook débloqué ! +10 points');
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        totalPoints,
        messages
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Meal validation error:', error);
    
    const message = (error as Error).message;
    const isAuthError = message.includes('Unauthorized') || message.includes('JWT');
    
    return new Response(
      JSON.stringify({ 
        error: isAuthError ? 'Authentication required' : 'Failed to validate meal'
      }),
      { 
        status: isAuthError ? 401 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
