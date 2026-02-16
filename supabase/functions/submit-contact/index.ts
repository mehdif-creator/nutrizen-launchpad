/**
 * submit-contact: Public contact form handler
 * 
 * Security: CORS + DB-backed rate limiting + Zod validation
 * No HMAC required — this is a public form endpoint.
 * Secrets (N8N_WEBHOOK_BASE) are server-side only.
 */
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { createClient } from '../_shared/deps.ts';
import { getCorsHeaders, getClientIp } from '../_shared/security.ts';

const contactSchema = z.object({
  name: z.string().trim().min(2, "Le nom doit contenir au moins 2 caractères").max(100, "Le nom ne peut pas dépasser 100 caractères"),
  email: z.string().trim().email("Adresse email invalide").max(255, "L'email ne peut pas dépasser 255 caractères"),
  subject: z.string().trim().min(5, "Le sujet doit contenir au moins 5 caractères").max(200, "Le sujet ne peut pas dépasser 200 caractères"),
  message: z.string().trim().min(20, "Le message doit contenir au moins 20 caractères").max(5000, "Le message ne peut pas dépasser 5000 caractères"),
  timestamp: z.string().optional(),
});

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    // DB-backed rate limiting (survives cold starts)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const clientIp = getClientIp(req);
    const identifier = `ip:${clientIp}`;

    const { data: rlResult, error: rlError } = await supabaseAdmin.rpc('check_rate_limit', {
      p_identifier: identifier,
      p_endpoint: 'submit-contact',
      p_max_tokens: 5,
      p_refill_rate: 5,
      p_cost: 60, // 5 per hour
    });

    if (!rlError && rlResult && !rlResult.allowed) {
      return new Response(JSON.stringify({ error: 'Trop de demandes. Veuillez réessayer plus tard.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 429,
      });
    }

    const body = await req.json();

    // Validate and sanitize input
    const validatedData = contactSchema.parse(body);
    const { name, email, subject, message, timestamp } = validatedData;

    // Forward to n8n webhook (server-side secret only)
    const n8nWebhookBase = Deno.env.get('N8N_WEBHOOK_BASE');
    if (!n8nWebhookBase) {
      console.error('[submit-contact] N8N_WEBHOOK_BASE not configured');
      throw new Error('Webhook configuration error');
    }

    const webhookUrl = `${n8nWebhookBase}/webhook/contact`;
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        email,
        subject,
        message,
        timestamp: timestamp || new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      console.error('[submit-contact] n8n webhook failed:', response.status);
      throw new Error('Failed to submit contact form');
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error in submit-contact:', error);
    
    const userMessage = error instanceof z.ZodError 
      ? error.errors[0]?.message || 'Données invalides'
      : 'Impossible d\'envoyer le message. Veuillez réessayer.';
    
    return new Response(JSON.stringify({ error: userMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: error instanceof z.ZodError ? 400 : 500,
    });
  }
});
