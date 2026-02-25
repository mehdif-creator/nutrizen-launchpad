import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from '../_shared/deps.ts';
import { checkRateLimit, rateLimitExceededResponse } from '../_shared/rateLimit.ts';

const ALLOWED_ORIGINS = [
  'https://mynutrizen.fr',
  'https://app.mynutrizen.fr',
  'https://www.mynutrizen.fr',
  'http://localhost:5173',
  'http://localhost:3000',
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  const isAllowed = origin && ALLOWED_ORIGINS.includes(origin);
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

const redactId = (id: string): string => id ? id.substring(0, 8) + '***' : 'null';

const logStep = (step: string, details?: any) => {
  if (details) {
    if (details.userId) details.userId = redactId(details.userId);
    if (details.email) details.email = '***';
    if (details.customerId) details.customerId = redactId(details.customerId);
  }
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id });

    // Rate limiting
    const rl = await checkRateLimit(supabaseClient, {
      identifier: `user:${user.id}`,
      endpoint:   'check-subscription',
      maxTokens:  30,
      refillRate: 10,
      cost:       1,
    });
    if (!rl.allowed) return rateLimitExceededResponse(corsHeaders, rl.retryAfter);

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No Stripe customer found — checking DB");

      // Check profile for plan_tier
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('plan_tier, welcome_credits_granted')
        .eq('id', user.id)
        .maybeSingle();

      const { data: dbSub } = await supabaseClient
        .from('subscriptions')
        .select('status, trial_end')
        .eq('user_id', user.id)
        .maybeSingle();

      return new Response(JSON.stringify({
        subscribed: false,
        status: dbSub?.status ?? 'inactive',
        trial_end: dbSub?.trial_end ?? null,
        subscription_end: null,
        plan: profile?.plan_tier || 'free',
        plan_tier: profile?.plan_tier || 'free',
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Check active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    // Also check trialing
    let sub = subscriptions.data[0];
    if (!sub) {
      const trialingSubs = await stripe.subscriptions.list({
        customer: customerId,
        status: "trialing",
        limit: 1,
      });
      sub = trialingSubs.data[0];
    }

    if (!sub) {
      logStep("No active/trialing subscription");
      return new Response(JSON.stringify({
        subscribed: false,
        status: 'inactive',
        plan: 'free',
        plan_tier: 'free',
        subscription_end: null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const subscriptionEnd = new Date(sub.current_period_end * 1000).toISOString();
    const priceId = sub.items.data[0]?.price.id;

    // Get plan tier from price metadata
    let planTier = 'unknown';
    try {
      const price = await stripe.prices.retrieve(priceId);
      planTier = price.metadata?.plan_tier || 'unknown';
    } catch {
      // Fallback: check env vars
      const starterPrice = Deno.env.get('STRIPE_PRICE_STARTER_MONTHLY');
      const premiumPrice = Deno.env.get('STRIPE_PRICE_PREMIUM_MONTHLY');
      if (priceId === starterPrice) planTier = 'starter';
      else if (priceId === premiumPrice) planTier = 'premium';
    }

    // Update profile + subscription
    await supabaseClient.from('profiles').update({ plan_tier: planTier }).eq('id', user.id);
    await supabaseClient.from('subscriptions').upsert({
      user_id: user.id,
      status: sub.status,
      plan: planTier,
      stripe_customer_id: customerId,
      stripe_subscription_id: sub.id,
      current_period_end: subscriptionEnd,
    }, { onConflict: 'user_id' });

    logStep("Subscription found", { status: sub.status, planTier });

    return new Response(JSON.stringify({
      subscribed: true,
      status: sub.status,
      plan: planTier,
      plan_tier: planTier,
      subscription_end: subscriptionEnd,
      trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
      current_period_end: subscriptionEnd,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
