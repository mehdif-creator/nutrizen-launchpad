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

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if already awarded today (Europe/Paris timezone)
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' });
    
    const { data: existingEvent } = await supabaseClient
      .from('user_events')
      .select('id')
      .eq('user_id', user.id)
      .eq('event_type', 'APP_OPEN')
      .gte('occurred_at', `${today}T00:00:00+01:00`)
      .lte('occurred_at', `${today}T23:59:59+01:00`)
      .maybeSingle();

    if (existingEvent) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Already awarded today',
          alreadyAwarded: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Award +2 points for app open
    const { error: awardError } = await supabaseClient.rpc('fn_award_event', {
      p_event_type: 'APP_OPEN',
      p_points: 2,
      p_credits: 0,
      p_meta: { timestamp: new Date().toISOString() },
    });

    if (awardError) throw awardError;

    return new Response(
      JSON.stringify({ 
        success: true, 
        points: 2,
        message: '+2 points for opening the app today!'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});