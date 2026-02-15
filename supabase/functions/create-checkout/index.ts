import Stripe from "https://esm.sh/stripe@18.5.0?target=deno";
import { createClient } from '../_shared/deps.ts';

// SECURITY: Strict CORS allow-list
const ALLOWED_ORIGINS = [
  'https://mynutrizen.fr',
  'https://app.mynutrizen.fr',
  'http://localhost:5173', // Dev only
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  const isAllowed = origin && ALLOWED_ORIGINS.includes(origin);
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

// Plan key → env var mapping (no hardcoded price IDs)
const PLAN_ENV_KEYS: Record<string, string> = {
  essentiel: "STRIPE_PRICE_ESSENTIEL",
  equilibre: "STRIPE_PRICE_EQUILIBRE",
  premium: "STRIPE_PRICE_PREMIUM",
};

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    logStep("Function started");

    const body = await req.json();
    // Accept plan key (e.g. "equilibre") OR legacy priceId
    const planKey = body.plan || body.planKey || 'equilibre';
    const email = body.email;
    
    if (!email) throw new Error("email is required");
    
    // Resolve price ID from env, falling back to legacy priceId if provided
    const envKey = PLAN_ENV_KEYS[planKey];
    let priceId = envKey ? Deno.env.get(envKey) : null;
    
    // Legacy fallback: if frontend still sends priceId directly
    if (!priceId && body.priceId) {
      logStep("WARN: Frontend sent raw priceId, using as fallback");
      priceId = body.priceId;
    }
    
    if (!priceId) {
      throw new Error(`No price configured for plan "${planKey}". Set ${envKey || 'STRIPE_PRICE_*'} in secrets.`);
    }
    
    logStep("Request received", { plan: planKey, email });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { 
      apiVersion: "2025-08-27.basil" 
    });

    // Authenticate user if auth header present
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? ""
      );
      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await supabaseClient.auth.getUser(token);
      userId = userData.user?.id || null;
    }

    logStep("Checking for existing customer", { email });
    const customers = await stripe.customers.list({ email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
      
      // Persist stripe_customer_id on profile
      if (userId) {
        const supabaseAdmin = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
          { auth: { persistSession: false } }
        );
        await supabaseAdmin
          .from('profiles')
          .update({ stripe_customer_id: customerId })
          .eq('id', userId);
      }
    }

    const requestOrigin = req.headers.get("origin") || "http://localhost:3000";
    const supabaseProjectRef = Deno.env.get("SUPABASE_URL")?.match(/https:\/\/([^.]+)/)?.[1] || "";
    
    // Get referral code from query params if present
    const url = new URL(req.url);
    const referralCode = url.searchParams.get('referral_code');
    const affiliateCode = url.searchParams.get('affiliate_code');
    
    // Use post-checkout-login edge function for auto-login after payment
    const appBaseUrl = Deno.env.get("APP_BASE_URL") || "https://mynutrizen.fr";
    const successUrl = supabaseProjectRef 
      ? `https://${supabaseProjectRef}.supabase.co/functions/v1/post-checkout-login?session_id={CHECKOUT_SESSION_ID}`
      : `${appBaseUrl}/auth/callback?from_checkout=true`;
    
    logStep("Creating checkout session", { plan: planKey, email, referralCode, affiliateCode, successUrl });
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : email,
      client_reference_id: userId || undefined,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      subscription_data: {
        trial_period_days: 7,
      },
      metadata: {
        plan: planKey,
        user_id: userId || '',
        app: 'nutrizen',
        referral_code: referralCode || '',
        affiliate_code: affiliateCode || '',
        from_checkout: 'true',
      },
      success_url: successUrl,
      cancel_url: `${requestOrigin}/?canceled=true`,
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url }), {
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