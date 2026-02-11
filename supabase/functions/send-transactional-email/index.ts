import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Template IDs - these should be configured in Brevo
const TEMPLATE_IDS: Record<string, number> = {
  welcome: 1,
  onboarding_reminder: 2,
  credits_receipt: 3,
  menu_ready: 4,
  weekly_digest: 5,
};

/**
 * Edge Function: send-transactional-email
 * 
 * Sends transactional emails via Brevo.
 * Called server-side only - API key never exposed to client.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Authenticate: only service role calls allowed
  const authHeader = req.headers.get('Authorization');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const token = authHeader?.replace('Bearer ', '');

  if (token !== serviceRoleKey) {
    console.warn('[send-transactional-email] Unauthorized call attempt');
    return new Response(
      JSON.stringify({ success: false, error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const brevoApiKey = Deno.env.get('BREVO_API_KEY');
    const senderEmail = Deno.env.get('BREVO_SENDER_EMAIL') || 'noreply@mynutrizen.fr';
    const senderName = Deno.env.get('BREVO_SENDER_NAME') || 'NutriZen';

    if (!brevoApiKey) {
      console.log('[send-transactional-email] BREVO_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Email service not configured' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Parse request body
    const body = await req.json();
    const { user_id, template_key, payload = {} } = body;

    if (!user_id || !template_key) {
      throw new Error('Missing required fields: user_id, template_key');
    }

    const templateId = TEMPLATE_IDS[template_key];
    if (!templateId) {
      throw new Error(`Unknown template: ${template_key}`);
    }

    console.log(`[send-transactional-email] Sending ${template_key} to user ${user_id.substring(0, 8)}...`);

    // Fetch user email from profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', user_id)
      .single();

    if (profileError || !profile?.email) {
      console.error('[send-transactional-email] Could not fetch user profile:', profileError);
      throw new Error('User profile not found or missing email');
    }

    // Create email event record
    const { data: emailEvent, error: eventError } = await supabase
      .from('email_events')
      .insert({
        user_id,
        event_type: template_key,
        provider: 'brevo',
        status: 'queued',
        metadata: { template_id: templateId, payload },
      })
      .select()
      .single();

    if (eventError) {
      console.error('[send-transactional-email] Error creating email event:', eventError);
    }

    // Build Brevo transactional email request
    const emailRequest = {
      sender: {
        name: senderName,
        email: senderEmail,
      },
      to: [{
        email: profile.email,
        name: profile.full_name || '',
      }],
      templateId,
      params: {
        PRENOM: profile.full_name?.split(' ')[0] || 'Ami(e)',
        ...payload,
      },
    };

    console.log(`[send-transactional-email] Sending to ${profile.email.substring(0, 3)}***`);

    // Call Brevo transactional API
    const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': brevoApiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify(emailRequest),
    });

    const responseText = await brevoResponse.text();
    let brevoResult: any = {};
    
    try {
      brevoResult = JSON.parse(responseText);
    } catch {
      brevoResult = { raw: responseText };
    }

    // Update email event status
    const updateStatus = brevoResponse.ok ? 'sent' : 'error';
    const updateData: any = {
      status: updateStatus,
    };

    if (brevoResponse.ok && brevoResult.messageId) {
      updateData.provider_message_id = brevoResult.messageId;
    } else if (!brevoResponse.ok) {
      updateData.error = JSON.stringify(brevoResult);
    }

    if (emailEvent?.id) {
      await supabase
        .from('email_events')
        .update(updateData)
        .eq('id', emailEvent.id);
    }

    if (!brevoResponse.ok) {
      console.error('[send-transactional-email] Brevo API error:', brevoResult);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Email sending failed',
          details: brevoResult,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[send-transactional-email] ✅ Email sent: ${brevoResult.messageId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message_id: brevoResult.messageId,
        template: template_key,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[send-transactional-email] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
