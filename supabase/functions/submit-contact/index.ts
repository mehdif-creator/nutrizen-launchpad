/**
 * submit-contact: Public contact form handler
 *
 * Security layers:
 * 1. Strict CORS via shared getCorsHeaders
 * 2. DB-backed rate limiting (survives cold starts)
 * 3. Zod schema validation
 * 4. Honeypot field ("website") — reject if filled
 * 5. Optional Turnstile verification (when TURNSTILE_SECRET_KEY is set)
 *
 * No client-held secrets required.
 */
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { createClient } from '../_shared/deps.ts';
import { getCorsHeaders, getClientIp, generateRequestId, Logger } from '../_shared/security.ts';

const contactSchema = z.object({
  name: z.string().trim().min(2, "Le nom doit contenir au moins 2 caractères").max(100),
  email: z.string().trim().email("Adresse email invalide").max(255),
  subject: z.string().trim().min(5, "Le sujet doit contenir au moins 5 caractères").max(200),
  message: z.string().trim().min(20, "Le message doit contenir au moins 20 caractères").max(5000),
  timestamp: z.string().optional(),
  // Anti-spam fields (not validated as user data)
  website: z.string().optional(),
  turnstileToken: z.string().optional(),
});

// ── Turnstile verification ──────────────────────────────────────────────────
async function verifyTurnstile(token: string, ip: string, logger: Logger): Promise<boolean> {
  const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (!secret) return true;

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
    });
    const data = await res.json();
    if (!data.success) {
      logger.warn("Turnstile failed", { errors: data["error-codes"] });
    }
    return data.success === true;
  } catch (err) {
    logger.error("Turnstile error", err);
    return false;
  }
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  const requestId = generateRequestId();
  const logger = new Logger(requestId, "submit-contact");
  const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json', 'X-Request-Id': requestId };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    // ── Parse body ──────────────────────────────────────────────────────
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ ok: false, code: "INVALID_BODY", message: "JSON invalide." }), {
        status: 400, headers: jsonHeaders,
      });
    }

    // ── Honeypot ────────────────────────────────────────────────────────
    if (body.website) {
      logger.warn("Honeypot triggered");
      // Return fake success to avoid leaking detection
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: jsonHeaders });
    }

    // ── DB-backed rate limiting ─────────────────────────────────────────
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const clientIp = getClientIp(req);

    const { data: rlResult, error: rlError } = await supabaseAdmin.rpc('check_rate_limit', {
      p_identifier: `ip:${clientIp}`,
      p_endpoint: 'submit-contact',
      p_max_tokens: 5,
      p_refill_rate: 5,
      p_cost: 1,
    });

    if (!rlError && rlResult && !rlResult.allowed) {
      return new Response(JSON.stringify({ ok: false, code: "RATE_LIMIT", message: "Trop de demandes. Réessaie dans quelques minutes." }), {
        status: 429, headers: { ...jsonHeaders, 'Retry-After': '60' },
      });
    }

    // ── Optional Turnstile ──────────────────────────────────────────────
    const turnstileRequired = !!Deno.env.get("TURNSTILE_SECRET_KEY");
    if (turnstileRequired) {
      const token = typeof body.turnstileToken === "string" ? body.turnstileToken : "";
      if (!token) {
        return new Response(JSON.stringify({ ok: false, code: "CAPTCHA_REQUIRED", message: "Vérification anti-robot requise." }), {
          status: 400, headers: jsonHeaders,
        });
      }
      const ok = await verifyTurnstile(token, clientIp, logger);
      if (!ok) {
        return new Response(JSON.stringify({ ok: false, code: "CAPTCHA_FAILED", message: "Vérification anti-robot échouée. Réessaie." }), {
          status: 403, headers: jsonHeaders,
        });
      }
    }

    // ── Validate input ──────────────────────────────────────────────────
    const parsed = contactSchema.parse(body);
    const { name, email, subject, message, timestamp } = parsed;

    // ── Forward to n8n webhook ──────────────────────────────────────────
    const n8nWebhookBase = Deno.env.get('N8N_WEBHOOK_BASE');
    if (!n8nWebhookBase) {
      logger.error('N8N_WEBHOOK_BASE not configured');
      return new Response(JSON.stringify({ ok: false, code: "CONFIG_ERROR", message: "Service temporairement indisponible." }), {
        status: 503, headers: jsonHeaders,
      });
    }

    const response = await fetch(`${n8nWebhookBase}/webhook/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, subject, message, timestamp: timestamp || new Date().toISOString() }),
    });

    if (!response.ok) {
      logger.error('n8n webhook failed', undefined, { status: response.status });
      return new Response(JSON.stringify({ ok: false, code: "UPSTREAM_ERROR", message: "Impossible d'envoyer le message. Réessaie plus tard." }), {
        status: 502, headers: jsonHeaders,
      });
    }

    logger.info("Contact submitted", { email });
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: jsonHeaders });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify({ ok: false, code: "VALIDATION_ERROR", message: error.errors[0]?.message || 'Données invalides' }), {
        status: 400, headers: jsonHeaders,
      });
    }

    logger.error('Unhandled error', error);
    return new Response(JSON.stringify({ ok: false, code: "INTERNAL_ERROR", message: "Impossible d'envoyer le message. Réessaie plus tard." }), {
      status: 500, headers: jsonHeaders,
    });
  }
});
