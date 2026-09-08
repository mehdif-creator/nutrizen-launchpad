import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "../_shared/deps.ts";
import { requireAdmin } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // ── Admin-only: verify JWT and admin role before exposing any config state ──
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await admin.auth.getUser(token);
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    await requireAdmin(admin, user.id);
  } catch {
    return new Response(JSON.stringify({ error: "Admin access required" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const checks: Record<string, { ok: boolean; detail?: string }> = {};
  const missing: string[] = [];

  // 1. Check required env vars (no infrastructure key names exposed)
  const requiredVars = [
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
  ];
  for (const v of requiredVars) {
    const present = !!Deno.env.get(v);
    if (!present) missing.push(v);
    checks[v] = { ok: present };
  }

  // 2. Check price env vars for credit packs (presence only, no values)
  const priceVars = [
    "STRIPE_PRICE_CREDITS_50",
    "STRIPE_PRICE_CREDITS_120",
    "STRIPE_PRICE_CREDITS_300",
    "STRIPE_PRICE_CREDITS_700",
  ];
  for (const v of priceVars) {
    const val = Deno.env.get(v);
    checks[v] = { ok: !!val, detail: val ? "configured" : "missing" };
    if (!val) missing.push(v);
  }

  // 3. Check subscription price vars (optional)
  const subVars = [
    "STRIPE_PRICE_ESSENTIEL_MONTHLY",
    "STRIPE_PRICE_ESSENTIEL_YEARLY",
    "STRIPE_PRICE_EQUILIBRE",
    "STRIPE_PRICE_PREMIUM",
  ];
  for (const v of subVars) {
    const val = Deno.env.get(v);
    checks[v] = { ok: !!val, detail: val ? "configured" : "missing (subscriptions disabled)" };
  }

  // 4. Test Stripe API connectivity (no account identifiers or error details returned)
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (stripeKey) {
    try {
      const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
      await stripe.accounts.retrieve("self");
      checks["stripe_api"] = { ok: true, detail: "Connected" };
    } catch (err) {
      console.error("[stripe-health] Stripe API error:", err);
      checks["stripe_api"] = { ok: false, detail: "Connection failed" };
    }
  } else {
    checks["stripe_api"] = { ok: false, detail: "Not configured" };
  }

  const allOk = missing.length === 0 && checks["stripe_api"]?.ok;

  return new Response(
    JSON.stringify({ ok: allOk, missing, checks }, null, 2),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: allOk ? 200 : 503,
    },
  );
});
