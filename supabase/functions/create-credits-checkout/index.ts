import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from '../_shared/deps.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CREDITS-CHECKOUT] ${step}${detailsStr}`);
};

// Credit pack configurations — price IDs from env, never hardcoded
const CREDIT_PACKS: Record<string, { credits: number; priceEnvKey: string; name: string }> = {
  pack_s: { credits: 50, priceEnvKey: 'STRIPE_PRICE_CREDITS_50', name: 'Pack S' },
  pack_m: { credits: 120, priceEnvKey: 'STRIPE_PRICE_CREDITS_120', name: 'Pack M' },
  pack_l: { credits: 300, priceEnvKey: 'STRIPE_PRICE_CREDITS_300', name: 'Pack L' },
  pack_xl: { credits: 700, priceEnvKey: 'STRIPE_PRICE_CREDITS_700', name: 'Pack XL' },
  zen_15: { credits: 15, priceEnvKey: 'ZEN_CREDITS_PRICE_ID', name: 'Crédits Zen x15' },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Parse request body
    let packId = 'pack_m'; // Default to Pack M
    try {
      const body = await req.json();
      if (body.pack_id) {
        packId = body.pack_id;
      }
    } catch {
      // No body or invalid JSON, use default
    }

    // Validate pack
    const pack = CREDIT_PACKS[packId];
    if (!pack) {
      throw new Error(`Invalid pack_id: ${packId}. Valid packs: ${Object.keys(CREDIT_PACKS).join(', ')}`);
    }

    // Authenticate user
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user?.email) {
      throw new Error(`Authentication error: ${userError?.message || 'No user email'}`);
    }

    const user = userData.user;
    logStep("User authenticated", { userId: user.id.substring(0, 8) + "***", email: (user.email || "").substring(0, 3) + "***" });

    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get price ID from environment
    const priceId = Deno.env.get(pack.priceEnvKey);
    
    if (!priceId) {
      logStep("WARNING: Price ID not configured", { envKey: pack.priceEnvKey });
      throw new Error(`Price ID for ${pack.name} not configured. Please add ${pack.priceEnvKey} to Supabase secrets.`);
    }
    
    logStep("Using price", { packId, priceId: priceId.substring(0, 15) + "***", credits: pack.credits });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing Stripe customer", { customerId: (customerId || "").substring(0, 10) + "***" });
      
      // Persist stripe_customer_id on profile for future webhook lookups
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );
      await supabaseAdmin
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    // Generate idempotency key for checkout creation
    const idempotencyKey = `checkout:${user.id}:${packId}:${Date.now()}`;
    
    // Create checkout session with user_id in metadata and client_reference_id
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      client_reference_id: user.id,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/app/dashboard?credits_purchased=true&pack=${packId}`,
      cancel_url: `${req.headers.get("origin")}/credits`,
      metadata: {
        supabase_user_id: user.id,
        user_id: user.id,
        app: "nutrizen",
        credits_type: "lifetime",
        credits_amount: String(pack.credits),
        pack_id: packId,
        pack_name: pack.name,
        product_role: "zen_credits_pack",
      },
    }, {
      idempotencyKey,
    });

    logStep("Checkout session created", { sessionId: session.id.substring(0, 15) + "***" });

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});