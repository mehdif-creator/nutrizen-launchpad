import { createClient } from '../_shared/deps.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { platform } = await req.json(); // twitter, facebook, instagram

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

    // Check if already shared today (1/day cap)
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' });
    
    const { data: existingShare } = await supabaseClient
      .from('user_events')
      .select('id')
      .eq('user_id', user.id)
      .eq('event_type', 'SOCIAL_SHARE')
      .gte('occurred_at', `${today}T00:00:00+01:00`)
      .lte('occurred_at', `${today}T23:59:59+01:00`)
      .maybeSingle();

    if (existingShare) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Already earned points for sharing today. Come back tomorrow!'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Award +5 points
    await supabaseClient.rpc('fn_award_event', {
      p_event_type: 'SOCIAL_SHARE',
      p_points: 5,
      p_credits: 0,
      p_meta: { platform, timestamp: new Date().toISOString() },
    });

    // Check for Viral Sharer badge (10 shares on different days)
    const { data: shareEvents } = await supabaseClient
      .from('user_events')
      .select('occurred_at')
      .eq('user_id', user.id)
      .eq('event_type', 'SOCIAL_SHARE');

    if (shareEvents && shareEvents.length >= 10) {
      // Check if badge already granted
      const { data: hasBadge } = await supabaseClient
        .from('user_badges')
        .select('id')
        .eq('user_id', user.id)
        .eq('badge_code', 'VIRAL_SHARER')
        .maybeSingle();

      if (!hasBadge) {
        await supabaseClient
          .from('user_badges')
          .insert({ user_id: user.id, badge_code: 'VIRAL_SHARER' });
        
        await supabaseClient.rpc('fn_award_event', {
          p_event_type: 'BADGE_GRANTED',
          p_points: 10,
          p_credits: 0,
          p_meta: { badge: 'VIRAL_SHARER' },
        });

        return new Response(
          JSON.stringify({ 
            success: true, 
            points: 15,
            badgeUnlocked: true,
            message: '🎉 Viral Sharer badge unlocked! +15 total points'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        points: 5,
        message: '+5 points for sharing!'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Social share error:', error);
    
    // Sanitize error - don't expose internal details
    const message = (error as Error).message;
    const isAuthError = message.includes('Unauthorized') || message.includes('JWT');
    
    return new Response(
      JSON.stringify({ 
        error: isAuthError ? 'Authentication required' : 'Failed to record social share'
      }),
      { 
        status: isAuthError ? 401 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});