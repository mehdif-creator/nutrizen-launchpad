import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from '../_shared/deps.ts';
import { getCorsHeaders } from '../_shared/security.ts';
import { checkRateLimit, rateLimitExceededResponse } from '../_shared/rateLimit.ts';

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CREDITS-CHECKOUT] ${step}${detailsStr}`);
};

// Credit pack configurations
const CREDIT_PACKS: Record<string, { credits: number; priceEnvKey: string; fallbackPriceId: string; name: string }> = {
  topup_30:  { credits: 30,  priceEnvKey: 'STRIPE_PRICE_TOPUP_30',  fallbackPriceId: 'price_1T4gEoIDcb01YPK1GYDA8CY3', name: 'Pack 30 crédits' },
  topup_80:  { credits: 80,  priceEnvKey: 'STRIPE_PRICE_TOPUP_80',  fallbackPriceId: 'price_1T4gEpIDcb01YPK10oJKnH9I', name: 'Pack 80 crédits' },
  topup_200: { credits: 200, priceEnvKey: 'STRIPE_PRICE_TOPUP_200', fallbackPriceId: 'price_1T4gEqIDcb01YPK11HbsZcT0', name: 'Pack 200 crédits' },
};

const resolvePriceId = (pack: { priceEnvKey: string; fallbackPriceId: string }): string => {
  const fromEnv = Deno.env.get(pack.priceEnvKey)?.trim();

  if (!fromEnv) {
    logStep('Missing price secret, using fallback', { key: pack.priceEnvKey });
    return pack.fallbackPriceId;
  }

  if (!fromEnv.startsWith('price_')) {
    logStep('Invalid price secret format, using fallback', { key: pack.priceEnvKey });
    return pack.fallbackPriceId;
  }

  return fromEnv;
};

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Parse request body
    let packId = 'topup_80'; // Default
    try {
      const body = await req.json();
      if (body.pack_id) packId = body.pack_id;
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
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user?.email) {
      throw new Error(`Authentication error: ${userError?.message || 'No user email'}`);
    }

    const user = userData.user;
    logStep("User authenticated", { userId: user.id.substring(0, 8) + "***" });

    // Rate limiting
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );
    const rl = await checkRateLimit(supabaseAdmin, {
      identifier: `user:${user.id}`,
      endpoint:   'create-credits-checkout',
      maxTokens:  30,
      refillRate: 10,
      cost:       1,
    });
    if (!rl.allowed) return rateLimitExceededResponse(corsHeaders, rl.retryAfter);

    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Resolve price ID (secret first, then safe fallback)
    const configuredPriceId = Deno.env.get(pack.priceEnvKey)?.trim();
    let priceId = resolvePriceId(pack);

    try {
      await stripe.prices.retrieve(priceId);
    } catch {
      if (configuredPriceId && configuredPriceId.startsWith('price_') && configuredPriceId !== pack.fallbackPriceId) {
        logStep('Configured price not found, retrying fallback', { key: pack.priceEnvKey });
        priceId = pack.fallbackPriceId;
        await stripe.prices.retrieve(priceId);
      } else {
        throw new Error(`Price ID invalide pour ${pack.name}. Vérifie ${pack.priceEnvKey}.`);
      }
    }

    logStep("Using price", { packId, credits: pack.credits });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      // Persist on profile
      await supabaseAdmin
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    // Check if user is Premium for coupon discount
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('plan_tier')
      .eq('id', user.id)
      .single();

    const isPremium = profile?.plan_tier === 'premium';
    const couponId = isPremium ? Deno.env.get('STRIPE_COUPON_PREMIUM_TOPUP') : undefined;

    // Create checkout session
    const idempotencyKey = `checkout:${user.id}:${packId}:${Date.now()}`;
    
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
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
        topup_credits: String(pack.credits),
      },
    };

    // Apply Premium coupon if applicable
    if (couponId) {
      sessionParams.discounts = [{ coupon: couponId }];
      logStep("Applied Premium coupon", { couponId });
    }

    const session = await stripe.checkout.sessions.create(sessionParams, { idempotencyKey });

    logStep("Checkout session created", { sessionId: session.id.substring(0, 15) + "***" });

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...getCorsHeaders(req.headers.get('origin')), "Content-Type": "application/json" }, status: 500 }
    );
  }
});
