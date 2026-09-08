import { createClient } from '../_shared/deps.ts';
import { pushToUsers } from '../_shared/pushNotify.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: isAdmin } = await admin.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin',
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Accès refusé' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const ticketId = typeof body?.ticket_id === 'string' ? body.ticket_id : null;
    const reply = typeof body?.message === 'string' ? body.message.trim() : '';
    const close = body?.close === true;

    if (!ticketId || !reply || reply.length > 5000) {
      return new Response(JSON.stringify({ error: 'Paramètres invalides' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: ticket, error: ticketError } = await admin
      .from('support_tickets')
      .select('id, subject, user_id, messages')
      .eq('id', ticketId)
      .single();

    if (ticketError || !ticket) {
      return new Response(JSON.stringify({ error: 'Ticket introuvable' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const existing = Array.isArray(ticket.messages) ? ticket.messages : [];
    const now = new Date().toISOString();
    const updatedMessages = [...existing, { role: 'admin', content: reply, at: now }];

    const { error: updateError } = await admin
      .from('support_tickets')
      .update({
        messages: updatedMessages,
        updated_at: now,
        status: close ? 'closed' : 'open',
      })
      .eq('id', ticketId);

    if (updateError) throw updateError;

    // Push notification to the customer (best effort)
    await pushToUsers(admin, [ticket.user_id], {
      title: 'Réponse du support NutriZen',
      body: reply.length > 120 ? `${reply.slice(0, 117)}…` : reply,
      url: '/app/support',
      tag: `ticket-${ticket.id}`,
    }).catch((e) => console.error('[support-ticket-reply] push', e));

    // Send the reply by email to the customer
    let emailed = false;
    const brevoApiKey = Deno.env.get('BREVO_API_KEY');
    const { data: authUser } = await admin.auth.admin.getUserById(ticket.user_id);
    const recipient = authUser?.user?.email;

    if (brevoApiKey && recipient) {
      const senderEmail = Deno.env.get('BREVO_SENDER_EMAIL') || 'noreply@mynutrizen.fr';
      const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': brevoApiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'NutriZen Support', email: senderEmail },
          to: [{ email: recipient }],
          replyTo: { email: 'support@mynutrizen.fr' },
          subject: `Re: ${ticket.subject}`,
          htmlContent: `<p>Bonjour,</p><p>${reply.replace(/</g, '&lt;').replace(/\n/g, '<br/>')}</p><p>— L'équipe NutriZen</p>`,
        }),
      });
      emailed = resp.ok;
      if (!resp.ok) console.error('[support-ticket-reply] Brevo error:', await resp.text());
    }

    return new Response(JSON.stringify({ success: true, emailed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[support-ticket-reply]', e);
    return new Response(JSON.stringify({ error: 'Erreur interne' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
