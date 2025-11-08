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
    const { referralCode, action } = await req.json(); // action: 'CLICKED', 'SIGNED_UP'

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

    // Find referrer by code
    const { data: referrer, error: referrerError } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .eq('referral_code', referralCode)
      .single();

    if (referrerError || !referrer) {
      throw new Error('Invalid referral code');
    }

    // Create or update referral record
    if (action === 'CLICKED') {
      const { error: insertError } = await supabaseAdmin
        .from('user_referrals')
        .insert({
          referrer_id: referrer.id,
          referred_email: currentUser?.email || null,
          status: 'CLICKED',
        });

      if (insertError && !insertError.message.includes('duplicate')) {
        throw insertError;
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Referral click recorded' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'SIGNED_UP' && currentUser) {
      // Update referral to SIGNED_UP
      const { error: updateError } = await supabaseAdmin
        .from('user_referrals')
        .update({ 
          referred_user_id: currentUser.id,
          referred_email: currentUser.email,
          status: 'SIGNED_UP',
          updated_at: new Date().toISOString()
        })
        .eq('referrer_id', referrer.id)
        .eq('referred_email', currentUser.email);

      if (updateError) {
        // Try inserting if update failed
        await supabaseAdmin
          .from('user_referrals')
          .insert({
            referrer_id: referrer.id,
            referred_user_id: currentUser.id,
            referred_email: currentUser.email,
            status: 'SIGNED_UP',
          });
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Referral signup recorded' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, message: 'Invalid action' }),
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