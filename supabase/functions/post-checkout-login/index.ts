/**
 * post-checkout-login: Tamper-resistant auto-login after Stripe checkout
 *
 * Accepts a high-entropy checkout_token (not Stripe session_id).
 * - If token status is "pending" (webhook hasn't arrived yet) → 202 { ready: false }
 * - If token status is "ready" → generate magic link, consume token, redirect or return JSON
 * - If token is consumed/expired/invalid → error
 *
 * Supports two modes:
 *   GET  ?token=...         → server-side redirect (original flow)
 *   POST { token: "..." }   → JSON response for polling from frontend
 */
import { createClient } from '../_shared/deps.ts';
import {
  getCorsHeaders,
  generateRequestId,
  Logger,
} from '../_shared/security.ts';

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  const requestId = generateRequestId();
  const logger = new Logger(requestId, "post-checkout-login");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json", "X-Request-Id": requestId };
  const appBase = Deno.env.get("APP_BASE_URL") || "https://mynutrizen.fr";

  try {
    // Extract token from query (GET) or body (POST)
    let token: string | null = null;
    const isPost = req.method === "POST";

    if (isPost) {
      try {
        const body = await req.json();
        token = typeof body.token === "string" ? body.token : null;
      } catch {
        return new Response(JSON.stringify({ ok: false, code: "INVALID_BODY", message: "Invalid JSON" }), {
          status: 400, headers: jsonHeaders,
        });
      }
    } else {
      const url = new URL(req.url);
      token = url.searchParams.get("token");
    }

    if (!token || token.length < 20) {
      logger.warn("Missing or invalid token");
      if (isPost) {
        return new Response(JSON.stringify({ ok: false, code: "INVALID_TOKEN", message: "Token manquant ou invalide." }), {
          status: 400, headers: jsonHeaders,
        });
      }
      return new Response(null, {
        status: 303,
        headers: { ...corsHeaders, Location: `${appBase}/auth/login?error=invalid_token` },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    // ── Lookup token ────────────────────────────────────────────────────
    const { data: tokenRow, error: lookupError } = await supabaseAdmin
      .from('checkout_tokens')
      .select('*')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (lookupError || !tokenRow) {
      logger.warn("Token not found or expired");
      if (isPost) {
        return new Response(JSON.stringify({ ok: false, code: "TOKEN_EXPIRED", message: "Token expiré ou invalide." }), {
          status: 410, headers: jsonHeaders,
        });
      }
      return new Response(null, {
        status: 303,
        headers: { ...corsHeaders, Location: `${appBase}/auth/login?error=session_expired` },
      });
    }

    // ── Already consumed ────────────────────────────────────────────────
    if (tokenRow.status === 'consumed') {
      logger.warn("Token already consumed");
      if (isPost) {
        return new Response(JSON.stringify({ ok: false, code: "TOKEN_CONSUMED", message: "Ce lien a déjà été utilisé." }), {
          status: 410, headers: jsonHeaders,
        });
      }
      return new Response(null, {
        status: 303,
        headers: { ...corsHeaders, Location: `${appBase}/auth/login?error=token_consumed` },
      });
    }

    // ── Pending: webhook hasn't arrived yet ──────────────────────────────
    if (tokenRow.status === 'pending') {
      logger.info("Token pending, webhook not yet received");
      if (isPost) {
        return new Response(JSON.stringify({ ok: true, ready: false, message: "Paiement en cours de vérification..." }), {
          status: 202, headers: jsonHeaders,
        });
      }
      // For GET redirect mode, show waiting page
      return new Response(null, {
        status: 303,
        headers: { ...corsHeaders, Location: `${appBase}/post-checkout?token=${token}&waiting=true` },
      });
    }

    // ── Token is "ready" — proceed with login ───────────────────────────
    const email = tokenRow.email;
    logger.info("Token ready, generating magic link");

    // Atomically consume the token (single-use)
    const { data: consumed, error: consumeError } = await supabaseAdmin
      .from('checkout_tokens')
      .update({ status: 'consumed', consumed_at: new Date().toISOString() })
      .eq('token', token)
      .eq('status', 'ready') // CAS: only consume if still ready (prevents race)
      .select('id')
      .maybeSingle();

    if (consumeError || !consumed) {
      logger.warn("Token race condition — already consumed by another request");
      if (isPost) {
        return new Response(JSON.stringify({ ok: false, code: "TOKEN_CONSUMED", message: "Ce lien a déjà été utilisé." }), {
          status: 410, headers: jsonHeaders,
        });
      }
      return new Response(null, {
        status: 303,
        headers: { ...corsHeaders, Location: `${appBase}/auth/login?error=token_consumed` },
      });
    }

    // Generate magic link for auto-login
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: `${appBase}/auth/callback?from_checkout=true`,
      },
    });

    if (linkError || !linkData.properties?.action_link) {
      logger.error("Failed to generate magic link", linkError);
      if (isPost) {
        return new Response(JSON.stringify({ ok: true, ready: true, redirect: `${appBase}/auth/login` }), {
          status: 200, headers: jsonHeaders,
        });
      }
      return new Response(null, {
        status: 303,
        headers: { ...corsHeaders, Location: `${appBase}/auth/login?error=login_failed` },
      });
    }

    logger.info("Magic link generated, redirecting");

    if (isPost) {
      return new Response(JSON.stringify({ ok: true, ready: true, redirect: linkData.properties.action_link }), {
        status: 200, headers: jsonHeaders,
      });
    }

    // GET mode: direct redirect to magic link
    return new Response(null, {
      status: 303,
      headers: { ...corsHeaders, Location: linkData.properties.action_link },
    });

  } catch (error) {
    logger.error("Unhandled error", error);
    if (req.method === "POST") {
      return new Response(JSON.stringify({ ok: false, code: "INTERNAL_ERROR", message: "Erreur inattendue." }), {
        status: 500, headers: jsonHeaders,
      });
    }
    return new Response(null, {
      status: 303,
      headers: { ...corsHeaders, Location: `${appBase}/auth/login?error=login_failed` },
    });
  }
});
