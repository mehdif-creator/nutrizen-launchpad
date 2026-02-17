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

    // Anti-spam: check if meal validated within last 60 seconds
    const { data: recentEvent } = await supabaseClient
      .from('user_events')
      .select('occurred_at')
      .eq('user_id', user.id)
      .eq('event_type', 'MEAL_VALIDATED')
      .gte('occurred_at', new Date(Date.now() - 60000).toISOString())
      .maybeSingle();

    if (recentEvent) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Please wait 60 seconds between meal validations'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let totalPoints = 0;
    const messages = [];

    // Award +3 points for meal validation
    await supabaseClient.rpc('fn_award_event', {
      p_event_type: 'MEAL_VALIDATED',
      p_points: 3,
      p_credits: 0,
      p_meta: { recipeId, durationMinutes },
    });
    totalPoints += 3;
    messages.push('+3 points for validating meal');

    // Update streak
    await supabaseClient.rpc('fn_touch_streak_today');
    messages.push('Streak updated!');

    // Day completed bonus
    if (dayCompleted) {
      await supabaseClient.rpc('fn_award_event', {
        p_event_type: 'DAY_COMPLETED',
        p_points: 5,
        p_credits: 0,
        p_meta: { date: new Date().toISOString() },
      });
      totalPoints += 5;
      messages.push('+5 bonus for completing full day!');
    }

    // Fast Cook badge check (if under 15 minutes)
    if (durationMinutes && durationMinutes <= 15) {
      const { data: fastCookEvents } = await supabaseClient
        .from('user_events')
        .select('id')
        .eq('user_id', user.id)
        .eq('event_type', 'MEAL_VALIDATED')
        .contains('meta', { durationMinutes: { lte: 15 } });

      if (fastCookEvents && fastCookEvents.length >= 10) {
        // Check if badge already granted
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
          
          await supabaseClient.rpc('fn_award_event', {
            p_event_type: 'BADGE_GRANTED',
            p_points: 10,
            p_credits: 0,
            p_meta: { badge: 'FAST_COOK' },
          });
          totalPoints += 10;
          messages.push('🎉 Fast Cook badge unlocked! +10 points');
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
    
    // Sanitize error - don't expose internal details
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