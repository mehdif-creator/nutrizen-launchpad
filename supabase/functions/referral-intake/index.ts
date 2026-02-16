/**
 * referral-intake: Public referral click tracking + authenticated attribution
 * 
 * Security:
 * - Click tracking: public, no auth needed, server extracts IP
 * - Attribution: requires authenticated user, uses auth.uid() not client data
 * - Client-provided ip_hash/user_agent are IGNORED (server extracts them)
 */
import { createClient } from '../_shared/deps.ts';
import { getCorsHeaders, getClientIp } from '../_shared/security.ts';
import { createHmac } from "node:crypto";

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { referralCode, action } = body;

    // Validate action is one of the allowed values
    const allowedActions = ['track_click', 'apply_attribution', 'CLICKED', 'SIGNED_UP'];
    if (!action || !allowedActions.includes(action)) {
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate referralCode format (alphanumeric, max 20 chars)
    if (referralCode && (typeof referralCode !== 'string' || !/^[A-Za-z0-9]{1,20}$/.test(referralCode))) {
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid referral code format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // SECURITY: Extract IP and UA server-side — never trust client-provided values
    const clientIp = getClientIp(req);
    const userAgent = req.headers.get('user-agent') || null;
    // Hash IP for privacy
    const ipHash = createHmac('sha256', Deno.env.get('HMAC_SECRET') || 'referral-salt')
      .update(clientIp)
      .digest('hex')
      .substring(0, 16);

    // Get current user if authenticated
    let currentUser = null;
    const authHeader = req.headers.get('Authorization');
    
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

      await supabaseAdmin
        .from('referral_clicks')
        .insert({
          referral_code: referralCode.toUpperCase(),
          referrer_user_id: codeData.user_id,
          ip_hash: ipHash,
          user_agent: userAgent,
        });

      return new Response(
        JSON.stringify({ success: true, message: 'Click tracked' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle signup attribution (requires authenticated user)
    if (action === 'apply_attribution' && referralCode && currentUser) {
      // SECURITY: Always use currentUser.id from the JWT, never from client body
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
            ip_hash: ipHash,
            user_agent: userAgent,
          });
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Referral click recorded' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Legacy action support: SIGNED_UP
    if (action === 'SIGNED_UP' && currentUser && referralCode) {
      // SECURITY: Always use currentUser.id from the JWT
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
    
    const origin = req.headers.get('origin');
    const corsHeaders = getCorsHeaders(origin);
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
