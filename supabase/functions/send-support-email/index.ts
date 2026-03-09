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
    // Authenticate the caller
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Non authentifié' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Session invalide' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { subject, message } = await req.json();

    if (!subject || !message || typeof subject !== 'string' || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'Sujet et message requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (subject.length > 200 || message.length > 5000) {
      return new Response(
        JSON.stringify({ success: false, error: 'Sujet ou message trop long' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const brevoApiKey = Deno.env.get('BREVO_API_KEY');
    if (!brevoApiKey) {
      console.error('[send-support-email] BREVO_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Service email non configuré' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userEmail = user.email || 'inconnu';
    const senderEmail = Deno.env.get('BREVO_SENDER_EMAIL') || 'noreply@mynutrizen.fr';

    const emailPayload = {
      sender: { name: 'NutriZen Support', email: senderEmail },
      to: [{ email: 'support@mynutrizen.fr', name: 'Support NutriZen' }],
      replyTo: { email: userEmail },
      subject: `[Support] ${subject}`,
      textContent: `${message}\n\n---\nEnvoyé par : ${userEmail}`,
    };

    console.log(`[send-support-email] Sending from ${userEmail.substring(0, 3)}*** subject="${subject.substring(0, 30)}"`);

    const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': brevoApiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });

    if (!brevoResponse.ok) {
      const errBody = await brevoResponse.text();
      console.error('[send-support-email] Brevo error:', errBody);
      return new Response(
        JSON.stringify({ success: false, error: 'Échec d\'envoi de l\'email' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await brevoResponse.json();
    console.log(`[send-support-email] ✅ Sent: ${result.messageId}`);

    return new Response(
      JSON.stringify({ success: true, message_id: result.messageId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[send-support-email] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
