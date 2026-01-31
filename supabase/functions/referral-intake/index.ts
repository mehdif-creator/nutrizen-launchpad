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
    const body = await req.json();
    const { referralCode, action, ip_hash, user_agent } = body;

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get current user if authenticated
    const authHeader = req.headers.get('Authorization');
    let currentUser = null;
    
    if (authHeader) {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } }
      );
      
      const { data: { user } } = await supabaseClient.auth.getUser();
      currentUser = user;
    }

    // Handle click tracking (public, no auth required)
    if (action === 'track_click' && referralCode) {
      // Find referrer by code in the new referral_codes table
      const { data: codeData, error: codeError } = await supabaseAdmin
        .from('referral_codes')
        .select('user_id')
        .eq('code', referralCode.toUpperCase())
        .single();

      if (codeError || !codeData) {
        return new Response(
          JSON.stringify({ success: false, message: 'Invalid referral code' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Record click
      await supabaseAdmin
        .from('referral_clicks')
        .insert({
          referral_code: referralCode.toUpperCase(),
          referrer_user_id: codeData.user_id,
          ip_hash: ip_hash || null,
          user_agent: user_agent || null,
        });

      return new Response(
        JSON.stringify({ success: true, message: 'Click tracked' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle signup attribution (requires authenticated user)
    if (action === 'apply_attribution' && referralCode && currentUser) {
      const { data, error } = await supabaseAdmin.rpc('handle_referral_signup', {
        p_referral_code: referralCode,
        p_new_user_id: currentUser.id,
      });

      if (error) {
        console.error('Error applying referral attribution:', error);
        return new Response(
          JSON.stringify({ success: false, message: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Legacy action support: CLICKED
    if (action === 'CLICKED' && referralCode) {
      const { data: codeData } = await supabaseAdmin
        .from('referral_codes')
        .select('user_id')
        .eq('code', referralCode.toUpperCase())
        .single();

      if (codeData) {
        await supabaseAdmin
          .from('referral_clicks')
          .insert({
            referral_code: referralCode.toUpperCase(),
            referrer_user_id: codeData.user_id,
          });
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Referral click recorded' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Legacy action support: SIGNED_UP
    if (action === 'SIGNED_UP' && currentUser && referralCode) {
      const { data, error } = await supabaseAdmin.rpc('handle_referral_signup', {
        p_referral_code: referralCode,
        p_new_user_id: currentUser.id,
      });

      if (error) {
        console.error('Referral signup error:', error);
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Referral signup recorded', data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, message: 'Invalid action or missing parameters' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Referral intake error:', error);
    
    const message = (error as Error).message;
    const isInvalidCode = message.includes('Invalid referral code');
    
    return new Response(
      JSON.stringify({ 
        error: isInvalidCode ? 'Invalid referral code' : 'Failed to process referral'
      }),
      { 
        status: isInvalidCode ? 404 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
