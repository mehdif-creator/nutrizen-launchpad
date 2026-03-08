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
    const { platform } = await req.json();

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

    // Award points via unified V2 gamification system
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' });
    const { data: result, error: awardError } = await supabaseClient.rpc('fn_emit_gamification_event', {
      p_event_type: 'SOCIAL_SHARE',
      p_meta: { platform, timestamp: new Date().toISOString() },
      p_idempotency_key: `share:${user.id}:${platform}:${today}`,
    });

    if (awardError) throw awardError;

    if (!result?.success) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: result?.error === 'daily_limit_reached' 
            ? 'Limite quotidienne atteinte. Revenez demain !'
            : (result?.error || 'Erreur inconnue'),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for Viral Sharer badge (10 shares)
    const { data: shareEvents } = await supabaseClient
      .from('gamification_events')
      .select('id')
      .eq('user_id', user.id)
      .eq('event_type', 'SOCIAL_SHARE');

    let badgeUnlocked = false;
    if (shareEvents && shareEvents.length >= 10) {
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
        
        await supabaseClient.rpc('fn_emit_gamification_event', {
          p_event_type: 'BADGE_GRANTED',
          p_meta: { badge: 'VIRAL_SHARER' },
          p_idempotency_key: `badge:${user.id}:VIRAL_SHARER`,
        });

        badgeUnlocked = true;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        points: result.points_awarded || 5,
        badgeUnlocked,
        message: badgeUnlocked 
          ? '🎉 Badge Viral Sharer débloqué !'
          : `+${result.points_awarded || 5} points pour le partage !`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Social share error:', error);
    
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
