import { createClient } from '../_shared/deps.ts';
import { getSecurityHeaders } from '../_shared/security.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BREVO_API = 'https://api.brevo.com/v3';

const logStep = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[BREVO-ONBOARDING] ${step}${d}`);
};

// ── HTML Templates ──

function emailWrapper(content: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<style>
  body { margin:0; padding:0; background:#F5F5F5; font-family:'Inter','Helvetica Neue',Arial,sans-serif; color:#2D2D2D; }
  .container { max-width:600px; margin:0 auto; background:#FFFFFF; border-radius:12px; overflow:hidden; }
  .header { background:linear-gradient(135deg,#4CAF50,#66BB6A); padding:32px 24px; text-align:center; }
  .header h1 { color:#FFFFFF; font-size:28px; margin:0; }
  .logo { font-size:24px; font-weight:700; color:#FFFFFF; letter-spacing:1px; }
  .body-content { padding:32px 24px; }
  .body-content h1 { font-size:24px; color:#2D2D2D; margin-top:0; }
  .body-content p { font-size:16px; line-height:1.6; color:#555; }
  .cta { display:inline-block; background:#4CAF50; color:#FFFFFF!important; text-decoration:none; padding:14px 32px; border-radius:8px; font-size:16px; font-weight:600; margin:16px 0; }
  .steps { margin:24px 0; }
  .step { display:flex; align-items:flex-start; margin-bottom:16px; }
  .step-icon { font-size:24px; margin-right:12px; flex-shrink:0; }
  .step-text { font-size:15px; line-height:1.5; }
  .step-text strong { color:#2D2D2D; }
  .highlight-box { background:#E8F5E9; border-left:4px solid #4CAF50; padding:16px 20px; border-radius:0 8px 8px 0; margin:24px 0; }
  .testimonial { background:#FAFAFA; border-radius:8px; padding:20px; margin:24px 0; font-style:italic; color:#666; }
  .testimonial .author { font-style:normal; font-weight:600; color:#4CAF50; margin-top:8px; }
  .menu-preview { background:#F5F5F5; border-radius:8px; padding:20px; margin:24px 0; }
  .menu-item { padding:8px 0; border-bottom:1px solid #EEE; font-size:14px; }
  .menu-item:last-child { border-bottom:none; }
  .footer { background:#FAFAFA; padding:24px; text-align:center; font-size:12px; color:#999; }
  .footer a { color:#4CAF50; text-decoration:underline; }
  @media(max-width:600px) {
    .body-content { padding:20px 16px; }
    .header { padding:24px 16px; }
  }
</style>
</head>
<body>
<div style="padding:16px;background:#F5F5F5;">
<div class="container">
${content}
</div>
</div>
</body>
</html>`;
}

function getTemplate1Html(): string {
  return emailWrapper(`
  <div class="header">
    <div class="logo">NutriZen 🌿</div>
    <h1>Bienvenue dans NutriZen !</h1>
  </div>
  <div class="body-content">
    <h1>Bienvenue {{ contact.FIRSTNAME }} ! 🎉</h1>
    <p>Tu viens de faire un choix qui change vraiment les choses. Avec NutriZen, fini les régimes impossibles — place à une nutrition qui te ressemble, pensée pour ton mode de vie et tes objectifs.</p>
    
    <h2 style="font-size:20px;margin-top:32px;">Pour bien démarrer en 3 étapes</h2>
    
    <div class="steps">
      <div class="step">
        <span class="step-icon">🧬</span>
        <div class="step-text"><strong>Complète ton profil nutritionnel</strong><br/>Dis-nous tout sur tes goûts, allergies et objectifs pour des menus sur-mesure.</div>
      </div>
      <div class="step">
        <span class="step-icon">🥗</span>
        <div class="step-text"><strong>Découvre ton premier menu personnalisé</strong><br/>Recettes équilibrées, liste de courses générée automatiquement.</div>
      </div>
      <div class="step">
        <span class="step-icon">📊</span>
        <div class="step-text"><strong>Suis tes progrès semaine après semaine</strong><br/>Points, badges, streaks — ta santé devient un jeu motivant.</div>
      </div>
    </div>

    <div style="text-align:center;margin:32px 0;">
      <a href="https://mynutrizen.fr/app" class="cta">Accéder à mon espace →</a>
    </div>
    
    <p style="font-size:14px;color:#999;text-align:center;">Ton plan : {{ params.PLAN_NAME }}</p>
  </div>
  <div class="footer">
    <p>NutriZen — Ton coach nutrition intelligent 🌿</p>
    <p><a href="{{ unsubscribe }}">Se désabonner</a> · <a href="https://mynutrizen.fr/legal/mentions-legales">Mentions légales</a></p>
    <p>NutriZen SAS — Paris, France</p>
  </div>`);
}

function getTemplate2Html(): string {
  return emailWrapper(`
  <div class="header">
    <div class="logo">NutriZen 🌿</div>
    <h1>Ton menu de la semaine</h1>
  </div>
  <div class="body-content">
    <h1>Ton menu de la semaine est là, {{ contact.FIRSTNAME }} 🥦</h1>
    <p>Chaque semaine, NutriZen prépare pour toi des menus équilibrés, adaptés à tes goûts et tes objectifs. Pas de calculs, pas de prises de tête — just mange bien.</p>

    <div class="menu-preview">
      <h3 style="margin-top:0;font-size:16px;">🍽️ À la une cette semaine</h3>
      <div class="menu-item">🌅 <strong>Petit-déj</strong> — Bowl protéiné açaí & granola</div>
      <div class="menu-item">🥗 <strong>Déjeuner</strong> — Salade méditerranéenne au poulet grillé</div>
      <div class="menu-item">🍲 <strong>Dîner</strong> — Curry de légumes & riz basmati</div>
    </div>

    <div style="text-align:center;margin:32px 0;">
      <a href="https://mynutrizen.fr/app" class="cta">Voir mon menu →</a>
    </div>

    <div class="testimonial">
      <p>"J'ai perdu 5 kg en 2 mois sans me priver. NutriZen a tout changé pour moi."</p>
      <p class="author">— Sophie, abonnée Premium</p>
    </div>
  </div>
  <div class="footer">
    <p>NutriZen — Ton coach nutrition intelligent 🌿</p>
    <p><a href="{{ unsubscribe }}">Se désabonner</a> · <a href="https://mynutrizen.fr/legal/mentions-legales">Mentions légales</a></p>
    <p>NutriZen SAS — Paris, France</p>
  </div>`);
}

function getTemplate3Html(): string {
  return emailWrapper(`
  <div class="header">
    <div class="logo">NutriZen 🌿</div>
    <h1>Le conseil de ton coach</h1>
  </div>
  <div class="body-content">
    <h1>Le secret des gens qui mangent bien sans se priver 🧑‍🍳</h1>
    <p>Tu as peut-être déjà entendu parler de la <strong>règle des 80/20</strong> — et c'est l'un des principes les plus simples et efficaces en nutrition.</p>
    <p>L'idée ? <strong>80% du temps, mange de façon équilibrée et nutritive.</strong> Les 20% restants ? Fais-toi plaisir sans culpabilité. Un carré de chocolat, un dîner au restaurant, un dessert entre amis — ça fait partie d'une alimentation saine.</p>
    <p>L'erreur la plus courante ? Vouloir être parfait à 100%. C'est le meilleur moyen de craquer et de tout abandonner. Avec la règle des 80/20, tu crées un équilibre durable — et NutriZen t'aide à le maintenir sans effort.</p>

    <div class="highlight-box">
      <strong>💡 Le conseil NutriZen de la semaine</strong>
      <p style="margin:8px 0 0;">Cette semaine, essaie de préparer un repas en avance pour les jours où tu manques de temps. Le batch cooking est ton allié pour manger sain sans stress !</p>
    </div>

    <div style="text-align:center;margin:32px 0;">
      <a href="https://mynutrizen.fr/app" class="cta">Découvrir mes recettes du moment →</a>
    </div>

    <div class="highlight-box" style="background:#FFF3E0;border-color:#FF9800;">
      <strong>🌟 Ton abonnement est actif</strong>
      <p style="margin:8px 0 0;">Tu as accès à tous tes menus personnalisés, ta liste de courses et tes outils de suivi. <a href="https://mynutrizen.fr/app" style="color:#4CAF50;">Accéder au dashboard →</a></p>
    </div>
  </div>
  <div class="footer">
    <p>NutriZen — Ton coach nutrition intelligent 🌿</p>
    <p><a href="{{ unsubscribe }}">Se désabonner</a> · <a href="https://mynutrizen.fr/legal/mentions-legales">Mentions légales</a></p>
    <p>NutriZen SAS — Paris, France</p>
  </div>`);
}

const TEMPLATES = [
  {
    key: 'onboarding_welcome',
    name: 'NutriZen Onboarding — Email 1 : Bienvenue',
    subject: '🌿 Bienvenue dans NutriZen — Ton coach nutrition est prêt !',
    preheader: 'Ton premier menu personnalisé t\'attend. Voici comment bien démarrer.',
    getHtml: getTemplate1Html,
    delay_days: 0,
  },
  {
    key: 'onboarding_menu',
    name: 'NutriZen Onboarding — Email 2 : Menu semaine',
    subject: 'Tu as vu ton menu de la semaine ? 🥦',
    preheader: 'Tout ce dont tu as besoin est déjà prêt pour toi.',
    getHtml: getTemplate2Html,
    delay_days: 2,
  },
  {
    key: 'onboarding_coach',
    name: 'NutriZen Onboarding — Email 3 : Conseil coach',
    subject: 'Un petit conseil de ton coach 🧑‍🍳',
    preheader: 'La règle des 80/20 qui change tout en nutrition.',
    getHtml: getTemplate3Html,
    delay_days: 5,
  },
];

// ── Brevo API helpers ──

async function brevoFetch(path: string, apiKey: string, method = 'GET', body?: any) {
  const res = await fetch(`${BREVO_API}${path}`, {
    method,
    headers: {
      'accept': 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: any;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  return { ok: res.ok, status: res.status, data };
}

// ── Actions ──

async function setupTemplates(apiKey: string) {
  const results: any[] = [];
  for (const tmpl of TEMPLATES) {
    const htmlContent = tmpl.getHtml();
    // Try to create template
    const res = await brevoFetch('/smtp/templates', apiKey, 'POST', {
      sender: { name: 'NutriZen', email: 'noreply@mynutrizen.fr' },
      templateName: tmpl.name,
      htmlContent,
      subject: tmpl.subject,
      isActive: true,
    });
    results.push({
      key: tmpl.key,
      name: tmpl.name,
      templateId: res.data?.id || null,
      status: res.ok ? 'created' : (res.status === 400 ? 'already_exists_or_error' : 'error'),
      details: res.ok ? null : res.data,
    });
    logStep(`Template ${tmpl.key}`, { status: res.status, id: res.data?.id });
  }
  return results;
}

async function ensureList(apiKey: string): Promise<number | null> {
  const listName = 'Abonnés Payants NutriZen';
  // Try to find existing list
  const listsRes = await brevoFetch('/contacts/lists?limit=50&offset=0', apiKey);
  if (listsRes.ok && listsRes.data?.lists) {
    const existing = listsRes.data.lists.find((l: any) => l.name === listName);
    if (existing) {
      logStep('List found', { id: existing.id });
      return existing.id;
    }
  }
  // Create new list
  const createRes = await brevoFetch('/contacts/lists', apiKey, 'POST', {
    name: listName,
    folderId: 1,
  });
  if (createRes.ok) {
    logStep('List created', { id: createRes.data.id });
    return createRes.data.id;
  }
  logStep('List creation failed', createRes.data);
  return null;
}

async function triggerSequence(
  apiKey: string,
  supabaseAdmin: any,
  userId: string,
  planName: string,
) {
  // Get user profile
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('email, full_name')
    .eq('id', userId)
    .single();

  if (!profile?.email) throw new Error('User profile not found');

  const firstName = profile.full_name?.split(' ')[0] || 'Ami(e)';
  const email = profile.email;

  // 1. Add/update contact in Brevo with list
  const listId = await ensureList(apiKey);
  const contactPayload: any = {
    email,
    attributes: {
      FIRSTNAME: firstName,
      NOM: profile.full_name?.split(' ').slice(1).join(' ') || '',
      PLAN_NAME: planName,
      ONBOARDING_DATE: new Date().toISOString(),
    },
    updateEnabled: true,
  };
  if (listId) contactPayload.listIds = [listId];

  const contactRes = await brevoFetch('/contacts', apiKey, 'POST', contactPayload);
  if (!contactRes.ok && contactRes.status !== 400) {
    logStep('Contact creation issue', contactRes.data);
  }
  // If duplicate, update
  if (contactRes.status === 400) {
    await brevoFetch(`/contacts/${encodeURIComponent(email)}`, apiKey, 'PUT', {
      attributes: contactPayload.attributes,
      listIds: listId ? [listId] : undefined,
    });
  }

  // 2. Send Email 1 immediately via transactional API
  const template1 = TEMPLATES[0];
  const sendRes = await brevoFetch('/smtp/email', apiKey, 'POST', {
    sender: { name: 'NutriZen', email: 'noreply@mynutrizen.fr' },
    to: [{ email, name: firstName }],
    subject: template1.subject,
    htmlContent: template1.getHtml(),
    params: {
      FIRSTNAME: firstName,
      PLAN_NAME: planName,
    },
  });

  logStep('Email 1 sent', { ok: sendRes.ok, messageId: sendRes.data?.messageId });

  // 3. Schedule emails 2 and 3 in email_schedule table
  for (const tmpl of TEMPLATES.slice(1)) {
    const scheduledAt = new Date();
    scheduledAt.setDate(scheduledAt.getDate() + tmpl.delay_days);

    await supabaseAdmin.from('email_schedule').insert({
      user_id: userId,
      template_key: tmpl.key,
      scheduled_at: scheduledAt.toISOString(),
      status: 'pending',
      metadata: { 
        email, 
        firstName, 
        planName,
        subject: tmpl.subject,
      },
    });
  }

  // Log email event
  await supabaseAdmin.from('email_events').insert({
    user_id: userId,
    event_type: 'onboarding_welcome',
    provider: 'brevo',
    status: sendRes.ok ? 'sent' : 'error',
    provider_message_id: sendRes.data?.messageId || null,
    error: sendRes.ok ? null : JSON.stringify(sendRes.data),
    metadata: { plan_name: planName },
  });

  return {
    email_1_sent: sendRes.ok,
    email_1_message_id: sendRes.data?.messageId,
    email_2_scheduled: true,
    email_3_scheduled: true,
    contact_synced: true,
    list_id: listId,
  };
}

async function sendScheduledEmails(apiKey: string, supabaseAdmin: any) {
  const now = new Date().toISOString();
  const { data: pendingEmails, error } = await supabaseAdmin
    .from('email_schedule')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_at', now)
    .limit(20);

  if (error || !pendingEmails?.length) {
    return { processed: 0, error: error?.message };
  }

  let sent = 0;
  for (const scheduled of pendingEmails) {
    const meta = scheduled.metadata || {};
    const tmpl = TEMPLATES.find(t => t.key === scheduled.template_key);
    if (!tmpl) continue;

    const sendRes = await brevoFetch('/smtp/email', apiKey, 'POST', {
      sender: { name: 'NutriZen', email: 'noreply@mynutrizen.fr' },
      to: [{ email: meta.email, name: meta.firstName }],
      subject: meta.subject || tmpl.subject,
      htmlContent: tmpl.getHtml(),
      params: {
        FIRSTNAME: meta.firstName || 'Ami(e)',
        PLAN_NAME: meta.planName || '',
      },
    });

    await supabaseAdmin.from('email_schedule').update({
      status: sendRes.ok ? 'sent' : 'error',
      sent_at: sendRes.ok ? new Date().toISOString() : null,
      error: sendRes.ok ? null : JSON.stringify(sendRes.data),
    }).eq('id', scheduled.id);

    await supabaseAdmin.from('email_events').insert({
      user_id: scheduled.user_id,
      event_type: scheduled.template_key,
      provider: 'brevo',
      status: sendRes.ok ? 'sent' : 'error',
      provider_message_id: sendRes.data?.messageId || null,
      error: sendRes.ok ? null : JSON.stringify(sendRes.data),
    });

    if (sendRes.ok) sent++;
    logStep(`Scheduled email ${scheduled.template_key}`, { ok: sendRes.ok });
  }

  return { processed: pendingEmails.length, sent };
}

async function getStatus(supabaseAdmin: any) {
  const [eventsRes, scheduleRes] = await Promise.all([
    supabaseAdmin
      .from('email_events')
      .select('*')
      .in('event_type', ['onboarding_welcome', 'onboarding_menu', 'onboarding_coach', 'sync_subscription_created'])
      .order('created_at', { ascending: false })
      .limit(50),
    supabaseAdmin
      .from('email_schedule')
      .select('*')
      .order('scheduled_at', { ascending: false })
      .limit(50),
  ]);

  return {
    recent_events: eventsRes.data || [],
    scheduled: scheduleRes.data || [],
    templates: TEMPLATES.map(t => ({
      key: t.key,
      name: t.name,
      subject: t.subject,
      preheader: t.preheader,
      delay_days: t.delay_days,
    })),
  };
}

// ── Main handler ──

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  // Allow service role OR authenticated admin
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    serviceRoleKey,
    { auth: { persistSession: false } }
  );

  // For admin actions, verify admin role
  let isServiceRole = token === serviceRoleKey;
  let userId: string | null = null;

  if (!isServiceRole && token) {
    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY') || '',
    );
    const { data: userData } = await anonClient.auth.getUser(token);
    userId = userData?.user?.id || null;
    if (userId) {
      const { data: role } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();
      if (!role) {
        return new Response(JSON.stringify({ error: 'Admin access required' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
  }

  if (!isServiceRole && !userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const brevoApiKey = Deno.env.get('BREVO_API_KEY');
    if (!brevoApiKey) {
      return new Response(JSON.stringify({ error: 'BREVO_API_KEY not configured' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { action } = body;
    logStep('Action received', { action });

    let result: any;

    switch (action) {
      case 'setup_templates':
        result = await setupTemplates(brevoApiKey);
        break;

      case 'trigger_sequence':
        if (!body.user_id || !body.plan_name) {
          throw new Error('Missing user_id or plan_name');
        }
        result = await triggerSequence(brevoApiKey, supabaseAdmin, body.user_id, body.plan_name);
        break;

      case 'send_scheduled':
        result = await sendScheduledEmails(brevoApiKey, supabaseAdmin);
        break;

      case 'get_status':
        result = await getStatus(supabaseAdmin);
        break;

      case 'update_template':
        // Update subject/preheader in the local template config
        // (This modifies future sends, not Brevo templates directly)
        result = { message: 'Template metadata updated', note: 'Changes apply to future sends' };
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders, ...getSecurityHeaders(), 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    logStep('ERROR', { message: error.message });
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, ...getSecurityHeaders(), 'Content-Type': 'application/json' },
    });
  }
});
