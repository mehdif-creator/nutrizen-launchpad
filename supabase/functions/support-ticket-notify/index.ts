import { createClient } from '../_shared/deps.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ADMIN_EMAIL = Deno.env.get('SUPPORT_ADMIN_EMAIL') || 'support@mynutrizen.fr';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Non authentifié' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Session invalide' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const ticketId = typeof body?.ticket_id === 'string' ? body.ticket_id : null;
    const message = typeof body?.message === 'string' ? body.message.slice(0, 2000) : '';
    if (!ticketId) {
      return new Response(JSON.stringify({ error: 'ticket_id requis' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: ticket } = await admin
      .from('support_tickets')
      .select('id, subject, user_id, created_at')
      .eq('id', ticketId)
      .single();

    if (!ticket || ticket.user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Ticket introuvable' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const brevoApiKey = Deno.env.get('BREVO_API_KEY');
    if (!brevoApiKey) {
      return new Response(JSON.stringify({ success: false, error: 'Email non configuré' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const senderEmail = Deno.env.get('BREVO_SENDER_EMAIL') || 'noreply@mynutrizen.fr';
    const when = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });

    const payload = {
      sender: { name: 'NutriZen Support', email: senderEmail },
      to: [{ email: ADMIN_EMAIL }],
      replyTo: { email: user.email || senderEmail },
      subject: `[Nouveau ticket] ${ticket.subject}`,
      htmlContent: `
        <h2>Nouveau message support</h2>
        <p><strong>Client :</strong> ${user.email ?? 'inconnu'}</p>
        <p><strong>Reçu le :</strong> ${when} (Paris)</p>
        <p><strong>Sujet :</strong> ${ticket.subject}</p>
        <blockquote style="border-left:3px solid #ccc;padding-left:12px">${message.replace(/</g, '&lt;')}</blockquote>
        <p><a href="https://mynutrizen.fr/admin/tickets">Répondre depuis l'espace admin</a></p>
      `,
    };

    const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': brevoApiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error('[support-ticket-notify] Brevo error:', resp.status, errText);
      return new Response(JSON.stringify({ success: false, error: 'Échec notification' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[support-ticket-notify]', e);
    return new Response(JSON.stringify({ error: 'Erreur interne' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
