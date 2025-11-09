import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    // Get current week's challenge (Monday-based, Europe/Paris)
    const now = new Date();
    const parisDate = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
    const dayOfWeek = parisDate.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(parisDate);
    monday.setDate(parisDate.getDate() + mondayOffset);
    const weekStart = monday.toISOString().split('T')[0];

    const { data: challenge, error: challengeError } = await supabaseClient
      .from('weekly_challenges')
      .select('*')
      .eq('week_start', weekStart)
      .single();

    if (challengeError || !challenge) {
      throw new Error('No challenge found for this week');
    }

    // Check if already completed
    const { data: completion } = await supabaseClient
      .from('user_challenge_completions')
      .select('id')
      .eq('user_id', user.id)
      .eq('challenge_id', challenge.id)
      .maybeSingle();

    if (completion) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Challenge already completed this week'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create completion record
    await supabaseClient
      .from('user_challenge_completions')
      .insert({ user_id: user.id, challenge_id: challenge.id });

    // Award points
    await supabaseClient.rpc('fn_award_event', {
      p_event_type: 'WEEKLY_CHALLENGE_COMPLETED',
      p_points: challenge.points_reward,
      p_credits: 0,
      p_meta: { 
        challengeCode: challenge.code,
        challengeTitle: challenge.title,
        weekStart
      },
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        points: challenge.points_reward,
        challenge: challenge.title,
        message: `🎉 Challenge completed! +${challenge.points_reward} points`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Weekly challenge error:', error);
    
    // Sanitize error - don't expose internal details
    const message = (error as Error).message;
    const isAuthError = message.includes('Unauthorized') || message.includes('JWT');
    const isNotFound = message.includes('No challenge');
    
    return new Response(
      JSON.stringify({ 
        error: isAuthError ? 'Authentication required' : 
               isNotFound ? 'No challenge available for this week' :
               'Failed to complete challenge'
      }),
      { 
        status: isAuthError ? 401 : isNotFound ? 404 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});