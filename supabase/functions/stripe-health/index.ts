import Stripe from "https://esm.sh/stripe@18.5.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const checks: Record<string, { ok: boolean; detail?: string }> = {};
  const missing: string[] = [];

  // 1. Check required env vars
  const requiredVars = [
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
  ];
  for (const v of requiredVars) {
    const present = !!Deno.env.get(v);
    if (!present) missing.push(v);
    checks[v] = { ok: present };
  }

  // 2. Check price env vars for credit packs
  const priceVars = [
    "STRIPE_PRICE_CREDITS_50",
    "STRIPE_PRICE_CREDITS_120",
    "STRIPE_PRICE_CREDITS_300",
    "STRIPE_PRICE_CREDITS_700",
  ];
  for (const v of priceVars) {
    const val = Deno.env.get(v);
    checks[v] = { ok: !!val, detail: val ? `${val.substring(0, 12)}…` : "missing" };
    if (!val) missing.push(v);
  }

  // 3. Check subscription price vars (optional)
  const subVars = ["STRIPE_PRICE_ESSENTIEL", "STRIPE_PRICE_EQUILIBRE", "STRIPE_PRICE_PREMIUM"];
  for (const v of subVars) {
    const val = Deno.env.get(v);
    checks[v] = { ok: !!val, detail: val ? "configured" : "missing (subscriptions disabled)" };
  }

  // 4. Test Stripe API connectivity
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (stripeKey) {
    try {
      const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
      const account = await stripe.accounts.retrieve("self");
      checks["stripe_api"] = {
        ok: true,
        detail: `Connected: ${account.settings?.dashboard?.display_name || account.id}`,
      };
    } catch (err) {
      checks["stripe_api"] = { ok: false, detail: String(err).substring(0, 100) };
    }
  } else {
    checks["stripe_api"] = { ok: false, detail: "No key to test" };
  }

  const allOk = missing.length === 0 && checks["stripe_api"]?.ok;

  return new Response(
    JSON.stringify({ ok: allOk, missing, checks }, null, 2),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: allOk ? 200 : 503,
    }
  );
});
