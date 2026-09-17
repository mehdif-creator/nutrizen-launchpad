import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from '../_shared/deps.ts';
import { getCorsHeaders, generateRequestId, Logger } from '../_shared/security.ts';
import { checkRateLimit, rateLimitExceededResponse } from '../_shared/rateLimit.ts';

/** Subscription plan-key → env var holding the Stripe price id. */
const PLAN_ENV_KEYS: Record<string, string> = {
  starter: "STRIPE_PRICE_STARTER_MONTHLY",
  starter_monthly: "STRIPE_PRICE_STARTER_MONTHLY",
  starter_yearly: "STRIPE_PRICE_STARTER_YEARLY",
  premium: "STRIPE_PRICE_PREMIUM_MONTHLY",
  premium_monthly: "STRIPE_PRICE_PREMIUM_MONTHLY",
  premium_yearly: "STRIPE_PRICE_PREMIUM_YEARLY",
};

const PLAN_META: Record<string, { tier: string; credits: number; rollover_cap: number }> = {
  starter: { tier: 'starter', credits: 80, rollover_cap: 20 },
  starter_monthly: { tier: 'starter', credits: 80, rollover_cap: 20 },
  starter_yearly: { tier: 'starter', credits: 80, rollover_cap: 20 },
  premium: { tier: 'premium', credits: 200, rollover_cap: 80 },
  premium_monthly: { tier: 'premium', credits: 200, rollover_cap: 80 },
  premium_yearly: { tier: 'premium', credits: 200, rollover_cap: 80 },
};

function getAppBaseUrl(): string {
  return Deno.env.get("APP_BASE_URL") || "https://mynutrizen.fr";
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  const requestId = generateRequestId();
  const logger = new Logger(requestId, "create-app-checkout");
  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json", "X-Request-Id": requestId };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  const fail = (status: number, code: string, message: string) =>
    new Response(JSON.stringify({ error: { code, message } }), { status, headers: jsonHeaders });

  try {
    // ── Auth (required) ───────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return fail(401, "UNAUTHORIZED", "Connecte-toi pour effectuer un achat.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(authHeader.substring(7));
    const user = userData?.user;
    if (userError || !user?.email) {
      return fail(401, "UNAUTHORIZED", "Session invalide. Reconnecte-toi.");
    }

    // ── Rate limiting: 5 tentatives de paiement / heure / utilisateur ──
    const rl = await checkRateLimit(supabaseAdmin, {
      identifier: `user:${user.id}`,
      endpoint:   "create-app-checkout",
      maxTokens:  60,
      refillRate: 1,
      cost:       12,
    });
    if (!rl.allowed) return rateLimitExceededResponse(jsonHeaders, rl.retryAfter);

    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      return fail(400, "INVALID_BODY", "Requête invalide.");
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) return fail(503, "CONFIG_ERROR", "Service de paiement indisponible.");
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // ── Reuse / create Stripe customer ────────────────────────────────
    let customerId: string | undefined;
    const { data: profile } = await supabaseAdmin
      .from("profiles").select("stripe_customer_id").eq("id", user.id).maybeSingle();
    if (profile?.stripe_customer_id) {
      customerId = profile.stripe_customer_id as string;
    } else {
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      customerId = customers.data[0]?.id;
      if (!customerId) {
        const created = await stripe.customers.create({
          email: user.email,
          metadata: { supabase_user_id: user.id },
        });
        customerId = created.id;
      }
      await supabaseAdmin.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
    }

    const appBase = getAppBaseUrl();
    const mode = body.mode === "subscription" ? "subscription" : "topup";

    // ── Credit pack (one-time) ────────────────────────────────────────
    if (mode === "topup") {
      const packId = typeof body.pack_id === "string" ? body.pack_id : "";
      if (!packId) return fail(400, "VALIDATION_ERROR", "Pack manquant.");

      const { data: pack, error: packError } = await supabaseAdmin
        .from("credit_packs")
        .select("id, credits, stripe_price_id, active")
        .eq("id", packId)
        .maybeSingle();

      if (packError || !pack || !pack.active) {
        return fail(404, "PACK_NOT_FOUND", "Ce pack n'est pas disponible.");
      }

      const priceId = (pack.stripe_price_id as string | null)
        || Deno.env.get(`STRIPE_PRICE_TOPUP_${pack.credits}`);
      if (!priceId) {
        logger.error("Missing price for pack", undefined, { packId });
        return fail(503, "CONFIG_ERROR", "Ce pack n'est pas encore configuré pour l'achat.");
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "payment",
        line_items: [{ price: priceId, quantity: 1 }],
        client_reference_id: user.id,
        metadata: {
          supabase_user_id: user.id,
          user_id: user.id,
          pack_id: pack.id,
          topup_credits: String(pack.credits),
        },
        payment_intent_data: {
          metadata: { supabase_user_id: user.id, pack_id: pack.id, topup_credits: String(pack.credits) },
        },
        allow_promotion_codes: true,
        success_url: `${appBase}/app/credits?purchase=success`,
        cancel_url: `${appBase}/app/credits?purchase=canceled`,
      });

      logger.info("Top-up checkout created", { packId });
      return new Response(JSON.stringify({ url: session.url }), { status: 200, headers: jsonHeaders });
    }

    // ── Subscription ──────────────────────────────────────────────────
    const planKey = typeof body.plan === "string" ? body.plan : "premium";
    const envKey = PLAN_ENV_KEYS[planKey];
    if (!envKey) return fail(400, "INVALID_PLAN", "Plan invalide.");
    const priceId = Deno.env.get(envKey);
    if (!priceId) return fail(503, "CONFIG_ERROR", "Plan temporairement indisponible.");

    // Already subscribed → billing portal instead
    const existingSubs = await stripe.subscriptions.list({ customer: customerId!, status: "active", limit: 1 });
    if (existingSubs.data.length > 0) {
      const portal = await stripe.billingPortal.sessions.create({
        customer: customerId!,
        return_url: `${appBase}/app/settings`,
      });
      return new Response(JSON.stringify({ url: portal.url, existing_subscription: true }), {
        status: 200, headers: jsonHeaders,
      });
    }

    const meta = PLAN_META[planKey];
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: user.id,
      metadata: {
        supabase_user_id: user.id,
        user_id: user.id,
        plan: planKey,
        plan_tier: meta.tier,
        credits: String(meta.credits),
        rollover_cap: String(meta.rollover_cap),
      },
      subscription_data: {
        metadata: { supabase_user_id: user.id, user_id: user.id, plan: planKey, plan_tier: meta.tier },
      },
      allow_promotion_codes: true,
      success_url: `${appBase}/app/settings?subscription=success`,
      cancel_url: `${appBase}/app/settings?subscription=canceled`,
    });

    logger.info("Subscription checkout created", { planKey });
    return new Response(JSON.stringify({ url: session.url }), { status: 200, headers: jsonHeaders });
  } catch (err) {
    logger.error("Unhandled error", err as Error);
    return new Response(
      JSON.stringify({ error: { code: "INTERNAL_ERROR", message: "Erreur lors de la préparation du paiement." } }),
      { status: 500, headers: jsonHeaders },
    );
  }
});
