import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from '../_shared/deps.ts';
import {
  getCorsHeaders,
  getClientIp,
  checkRateLimit,
  sanitizeEmail,
  sanitizeString,
  generateRequestId,
  Logger,
} from '../_shared/security.ts';
import { checkRateLimit as checkRL, rateLimitExceededResponse } from '../_shared/rateLimit.ts';

// =============================================================================
// CONFIGURATION
// =============================================================================

/** Strict plan-key → env-var mapping. New plans + legacy plans. */
const PLAN_ENV_KEYS: Record<string, string> = {
  starter: "STRIPE_PRICE_STARTER_MONTHLY",
  premium: "STRIPE_PRICE_PREMIUM_MONTHLY",
  // Legacy plans (grandfathered - kept for existing subscribers)
  essentiel: "STRIPE_PRICE_ESSENTIEL_MONTHLY",
  essentiel_monthly: "STRIPE_PRICE_ESSENTIEL_MONTHLY",
  essentiel_yearly: "STRIPE_PRICE_ESSENTIEL_YEARLY",
  equilibre: "STRIPE_PRICE_EQUILIBRE",
};

/** Plan metadata for new plans */
const PLAN_META: Record<string, { tier: string; credits: number; rollover_cap: number; priority: boolean }> = {
  starter: { tier: 'starter', credits: 80, rollover_cap: 20, priority: false },
  premium: { tier: 'premium', credits: 200, rollover_cap: 80, priority: true },
};

const VALID_PLAN_KEYS = Object.keys(PLAN_ENV_KEYS);

/** Server-side redirect allow-list */
const ALLOWED_REDIRECT_ORIGINS = [
  'https://mynutrizen.fr',
  'https://app.mynutrizen.fr',
];

function getAppBaseUrl(): string {
  return Deno.env.get("APP_BASE_URL") || ALLOWED_REDIRECT_ORIGINS[0];
}

function getSafeOriginForCancel(requestOrigin: string | null): string {
  if (requestOrigin && ALLOWED_REDIRECT_ORIGINS.includes(requestOrigin)) {
    return requestOrigin;
  }
  return getAppBaseUrl();
}

// =============================================================================
// TURNSTILE VERIFICATION
// =============================================================================

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
      logger.warn("Turnstile verification failed", { errors: data["error-codes"] });
    }
    return data.success === true;
  } catch (err) {
    logger.error("Turnstile verification error", err);
    return false;
  }
}

function generateCheckoutToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  const requestId = generateRequestId();
  const logger = new Logger(requestId, "create-checkout");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json", "X-Request-Id": requestId };

  try {
    // ── Parse body ──────────────────────────────────────────────────────
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: { code: "INVALID_BODY", message: "Invalid JSON" } }), {
        status: 400, headers: jsonHeaders,
      });
    }

    // ── Honeypot ────────────────────────────────────────────────────────
    if (body.website) {
      logger.warn("Honeypot triggered");
      return new Response(JSON.stringify({ url: getAppBaseUrl() }), { status: 200, headers: jsonHeaders });
    }

    // ── Turnstile ───────────────────────────────────────────────────────
    const turnstileToken = typeof body.turnstile_token === "string" ? body.turnstile_token : null;
    const clientIp = getClientIp(req);

    if (Deno.env.get("TURNSTILE_SECRET_KEY")) {
      if (!turnstileToken) {
        return new Response(JSON.stringify({ error: { code: "CAPTCHA_REQUIRED", message: "Vérification anti-robot requise." } }), {
          status: 400, headers: jsonHeaders,
        });
      }
      const ok = await verifyTurnstile(turnstileToken, clientIp, logger);
      if (!ok) {
        return new Response(JSON.stringify({ error: { code: "CAPTCHA_FAILED", message: "Vérification anti-robot échouée." } }), {
          status: 403, headers: jsonHeaders,
        });
      }
    }

    // ── Rate limiting ───────────────────────────────────────────────────
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const rateResult = await checkRateLimit(
      supabaseAdmin, `ip:${clientIp}`, "create-checkout",
      { maxTokens: 20, refillRate: 20, cost: 1 }, logger,
    );
    if (!rateResult.allowed) {
      return new Response(
        JSON.stringify({ error: { code: "RATE_LIMIT_EXCEEDED", message: "Trop de requêtes." } }),
        { status: 429, headers: { ...jsonHeaders, "Retry-After": String(rateResult.retryAfter || 60) } },
      );
    }

    // ── Validate plan ───────────────────────────────────────────────────
    const planKey = typeof body.plan === "string" ? sanitizeString(body.plan) : (typeof body.planKey === "string" ? sanitizeString(body.planKey) : "premium");

    if (!VALID_PLAN_KEYS.includes(planKey)) {
      return new Response(JSON.stringify({ error: { code: "INVALID_PLAN", message: `Plan invalide. Plans: ${VALID_PLAN_KEYS.join(", ")}` } }), {
        status: 400, headers: jsonHeaders,
      });
    }

    const rawEmail = typeof body.email === "string" ? body.email : "";
    if (!rawEmail) {
      return new Response(JSON.stringify({ error: { code: "VALIDATION_ERROR", message: "L'email est requis." } }), {
        status: 400, headers: jsonHeaders,
      });
    }
    const email = sanitizeEmail(rawEmail);

    // ── Resolve price from env ──────────────────────────────────────────
    const envKey = PLAN_ENV_KEYS[planKey];
    const priceId = Deno.env.get(envKey);
    if (!priceId) {
      logger.error("Missing price env var", undefined, { envKey, planKey });
      return new Response(JSON.stringify({ error: { code: "CONFIG_ERROR", message: "Plan temporairement indisponible." } }), {
        status: 503, headers: jsonHeaders,
      });
    }

    logger.info("Request validated", { plan: planKey, email });

    // ── Stripe init ─────────────────────────────────────────────────────
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: { code: "CONFIG_ERROR", message: "Service de paiement indisponible." } }), {
        status: 503, headers: jsonHeaders,
      });
    }
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // ── Optional auth ───────────────────────────────────────────────────
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const supabaseAnon = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        );
        const token = authHeader.substring(7);
        const { data: userData } = await supabaseAnon.auth.getUser(token);
        userId = userData.user?.id || null;
        if (userId) {
          logger.info("Authenticated user", { userId });
          const rlUser = await checkRL(supabaseAdmin, {
            identifier: `user:${userId}`,
            endpoint:   'create-checkout',
            maxTokens:  30,
            refillRate: 10,
            cost:       1,
          });
          if (!rlUser.allowed) return rateLimitExceededResponse(getCorsHeaders(origin), rlUser.retryAfter);

          // ── Check for existing active subscription (one user = one sub) ──
          const customers = await stripe.customers.list({ email, limit: 1 });
          if (customers.data.length > 0) {
            const existingSubs = await stripe.subscriptions.list({
              customer: customers.data[0].id,
              status: 'active',
              limit: 1,
            });
            if (existingSubs.data.length > 0) {
              // User already has active subscription → route to portal
              logger.info("User already has active subscription, redirecting to portal");
              const portalSession = await stripe.billingPortal.sessions.create({
                customer: customers.data[0].id,
                return_url: `${getAppBaseUrl()}/app/settings`,
              });
              return new Response(JSON.stringify({ url: portalSession.url, existing_subscription: true }), {
                status: 200, headers: jsonHeaders,
              });
            }
          }
        }
      } catch {
        logger.warn("Auth token invalid, continuing as anonymous");
      }
    }

    // ── Stripe customer lookup ──────────────────────────────────────────
    const customers = await stripe.customers.list({ email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      if (userId) {
        await supabaseAdmin.from("profiles").update({ stripe_customer_id: customerId }).eq("id", userId);
      }
    }

    // ── Generate checkout_token ─────────────────────────────────────────
    const checkoutToken = generateCheckoutToken();
    const tokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const { error: tokenInsertError } = await supabaseAdmin
      .from('checkout_tokens')
      .insert({
        token: checkoutToken,
        email,
        user_id: userId,
        plan_key: planKey,
        status: 'pending',
        expires_at: tokenExpiresAt,
      });

    if (tokenInsertError) {
      logger.error("Failed to create checkout_token", tokenInsertError);
      return new Response(JSON.stringify({ error: { code: "INTERNAL_ERROR", message: "Erreur préparation paiement." } }), {
        status: 500, headers: jsonHeaders,
      });
    }

    // ── Build URLs ──────────────────────────────────────────────────────
    const appBase = getAppBaseUrl();
    const successUrl = `${appBase}/post-checkout?token=${checkoutToken}`;
    const cancelUrl = `${getSafeOriginForCancel(origin)}/?canceled=true`;

    // ── Referral / affiliate ────────────────────────────────────────────
    const url = new URL(req.url);
    const referralCode = sanitizeString(url.searchParams.get("referral_code") || "").substring(0, 50);
    const affiliateCode = sanitizeString(url.searchParams.get("affiliate_code") || "").substring(0, 50);

    // ── Plan metadata ───────────────────────────────────────────────────
    const meta = PLAN_META[planKey] || {};

    // ── Create Stripe Checkout session ──────────────────────────────────
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : email,
      client_reference_id: userId || undefined,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      metadata: {
        plan: planKey,
        plan_tier: meta.tier || planKey,
        credits_monthly: String(meta.credits || 0),
        rollover_cap: String(meta.rollover_cap || 0),
        user_id: userId || "",
        app: "nutrizen",
        referral_code: referralCode,
        affiliate_code: affiliateCode,
        from_checkout: "true",
        checkout_token: checkoutToken,
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    // Update token with session id
    await supabaseAdmin
      .from('checkout_tokens')
      .update({ stripe_session_id: session.id })
      .eq('token', checkoutToken);

    logger.info("Checkout session created", { sessionId: session.id });

    return new Response(JSON.stringify({ url: session.url }), { status: 200, headers: jsonHeaders });

  } catch (error) {
    logger.error("Unhandled error", error);
    return new Response(
      JSON.stringify({ error: { code: "INTERNAL_ERROR", message: "Erreur inattendue. Réessaie." } }),
      { status: 500, headers: jsonHeaders },
    );
  }
});
