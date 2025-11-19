import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

// SECURITY: Strict CORS - only allow requests from Stripe
// Stripe webhooks don't send Origin header, so we don't validate CORS here
// Signature verification provides security instead
const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

// Helper function to redact sensitive data
const redactEmail = (email: string): string => {
  const [user, domain] = email.split('@');
  return `${user.slice(0, 2)}***@${domain}`;
};

const redactId = (id: string): string => {
  return id ? `${id.slice(0, 8)}***` : '[NONE]';
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received", { method: req.method, hasSignature: !!req.headers.get("stripe-signature") });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      logStep("ERROR: No stripe signature found in headers");
      throw new Error("No stripe signature found");
    }

    const body = await req.text();
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!webhookSecret) {
      logStep("ERROR: STRIPE_WEBHOOK_SECRET not configured in env");
      throw new Error("STRIPE_WEBHOOK_SECRET not configured");
    }
    
    logStep("Constructing Stripe event from webhook");
    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
      logStep("Stripe event constructed successfully", { eventId: event.id });
    } catch (err) {
      logStep("ERROR: Failed to construct Stripe event", { error: String(err) });
      throw err;
    }

    logStep("Event type", { type: event.type, eventId: event.id });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // SECURITY: Idempotency check - prevent duplicate processing
    const { data: existingEvent } = await supabaseAdmin
      .from('stripe_events')
      .select('id')
      .eq('event_id', event.id)
      .maybeSingle();

    if (existingEvent) {
      logStep("Event already processed, skipping", { eventId: event.id });
      return new Response(JSON.stringify({ received: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Record event as processed
    await supabaseAdmin
      .from('stripe_events')
      .insert({
        event_id: event.id,
        event_type: event.type,
      });

    // Handle checkout.session.completed - Create user account OR credit purchase
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerEmail = session.customer_email || session.customer_details?.email;
      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;
      
      // Check if this is a credit pack purchase
      const isCreditPurchase = session.metadata?.product_role === 'zen_credits_pack' || session.metadata?.credits_type === 'lifetime';
      const creditsAmount = session.metadata?.credits_amount ? parseInt(session.metadata.credits_amount) : null;
      const supabaseUserId = session.metadata?.supabase_user_id;
      
      if (isCreditPurchase && creditsAmount && supabaseUserId) {
        // Handle credit pack purchase
        logStep("Processing credit pack purchase", {
          userId: redactId(supabaseUserId),
          credits: creditsAmount,
          sessionId: session.id.substring(0, 8) + "***"
        });
        
        try {
          const { data: creditsResult, error: creditsError } = await supabaseAdmin.rpc('add_credits_from_purchase', {
            p_user_id: supabaseUserId,
            p_amount: creditsAmount,
            p_credit_type: 'lifetime',
            p_metadata: {
              stripe_event_id: event.id,
              stripe_session_id: session.id,
              stripe_customer_id: customerId,
              stripe_payment_intent: session.payment_intent,
              amount_paid: session.amount_total,
              currency: session.currency,
              product_id: 'prod_TS7tSGWcVfrv4S',
              purchased_at: new Date().toISOString()
            }
          });
          
          if (creditsError) {
            logStep("ERROR adding credits", { error: creditsError.message });
            throw creditsError;
          }
          
          logStep("Credits added successfully", { 
            subscriptionBalance: creditsResult.subscription_balance,
            lifetimeBalance: creditsResult.lifetime_balance,
            totalBalance: creditsResult.total_balance
          });
          
          return new Response(JSON.stringify({ received: true, credits_added: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        } catch (error) {
          logStep("CRITICAL ERROR processing credit purchase", { error: String(error) });
          throw error;
        }
      }
      
      // Original subscription handling logic follows
      // Get referral code from session metadata if it exists
      const referralCode = session.metadata?.referral_code;
      const fromCheckout = session.metadata?.from_checkout === 'true';

      if (!customerEmail) {
        throw new Error("No customer email found");
      }

      logStep("Processing checkout for customer", { 
        email: redactEmail(customerEmail), 
        customerId: redactId(customerId),
        subscriptionId: redactId(subscriptionId),
        referralCode: referralCode ? '[REDACTED]' : null,
        fromCheckout 
      });

      // Create a random password for the user
      const randomPassword = crypto.randomUUID();

      // Check if user already exists
      let userId: string | null = null;
      logStep("Checking for existing user");
      const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (listError) {
        logStep("ERROR listing users", { error: listError.message });
        throw listError;
      }
      
      const existingUser = existingUsers.users.find(u => u.email === customerEmail);
      
      if (existingUser) {
        logStep("User already exists", { email: redactEmail(customerEmail), userId: redactId(existingUser.id) });
        userId = existingUser.id;
        // Update existing subscription
        logStep("Updating subscription for existing user");
        await updateSubscriptionRecord(supabaseAdmin, userId, customerId, subscriptionId, session, stripe);
      } else {
        // Create user in Supabase Auth - email_confirm: true to skip default email
        logStep("Creating new user in Supabase Auth", { email: redactEmail(customerEmail) });
        
        try {
          const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: customerEmail,
            password: randomPassword,
            email_confirm: true, // Skip default confirmation email - we'll send magic link
            user_metadata: {
              stripe_customer_id: customerId,
              created_via_stripe: true,
            },
          });

          if (authError) {
            logStep("ERROR creating user in Supabase Auth", { 
              error: authError.message,
              code: authError.status,
              details: JSON.stringify(authError)
            });
            throw authError;
          }
          
          if (!authData.user) {
            logStep("ERROR: User creation returned no user data");
            throw new Error("User creation failed - no user data returned");
          }
          
          userId = authData.user.id;
          logStep("User created successfully in Supabase Auth", { userId: redactId(userId) });
          
          // Small delay to let triggers complete
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Create subscription record
          logStep("Creating subscription record");
          await updateSubscriptionRecord(supabaseAdmin, userId, customerId, subscriptionId, session, stripe);
          
        } catch (createError) {
          logStep("CRITICAL ERROR during user creation", {
            error: String(createError),
            email: redactEmail(customerEmail),
            customerId: redactId(customerId)
          });
          throw createError;
        }
      }
      
      // Create one-time login token for immediate access
      if (userId && session.id) {
        const appBaseUrl = Deno.env.get("APP_BASE_URL") || "https://mynutrizen.fr";
        
        // Generate secure one-time token tied to checkout session
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
        
        logStep("Creating one-time login token", { 
          email: redactEmail(customerEmail),
          sessionId: session.id.substring(0, 8) + "***"
        });
        
        const { error: tokenError } = await supabaseAdmin
          .from('login_tokens')
          .insert({
            email: customerEmail,
            token: crypto.randomUUID(),
            session_id: session.id,
            expires_at: expiresAt.toISOString(),
          });
        
        if (tokenError) {
          logStep("ERROR creating login token", { error: tokenError.message });
        } else {
          logStep("One-time login token created - user will be auto-logged in via success_url");
        }
      }
        
      // Handle referral rewards for subscription
      if (referralCode && userId) {
        logStep("Processing referral signup and subscription reward", { 
          referralCode: '[REDACTED]', 
          newUserId: redactId(userId) 
        });
          
        try {
          // Call handle-referral function for signup tracking
          const referralResponse = await fetch(
            `${Deno.env.get("SUPABASE_URL")}/functions/v1/handle-referral`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              },
              body: JSON.stringify({
                referralCode,
                newUserId: userId,
              }),
            }
          );
          
          if (referralResponse.ok) {
            logStep("Referral signup tracked successfully");
          }
          
          // Award subscription rewards via RPC
          const { error: rewardError } = await supabaseAdmin.rpc('handle_referred_user_subscribed', {
            p_referred_user_id: userId,
            p_referral_code: referralCode,
          });
          
          if (rewardError) {
            logStep("Referral subscription reward failed", { error: rewardError.message });
          } else {
            logStep("Referral subscription reward processed successfully");
          }
        } catch (referralError) {
          logStep("Referral processing error", { error: String(referralError) });
        }
      }
    }

    // Handle subscription updates
    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      const { data: users } = await supabaseAdmin.auth.admin.listUsers();
      const user = users.users.find(u => u.user_metadata?.stripe_customer_id === customerId);

      if (user) {
        await updateSubscriptionRecord(supabaseAdmin, user.id, customerId, subscription.id, null, stripe);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

async function updateSubscriptionRecord(
  supabaseAdmin: any,
  userId: string,
  customerId: string,
  subscriptionId: string | null,
  session: Stripe.Checkout.Session | null,
  stripe: Stripe
) {
  let subscription = null;
  let plan = null;
  let status = 'trialing';
  let trialEnd = null;
  let currentPeriodEnd = null;
  let trialStart = null;

  // Safe timestamp conversion helper
  const safeTimestamp = (unixTime: number | null | undefined): string | null => {
    if (!unixTime || typeof unixTime !== 'number') return null;
    try {
      const date = new Date(unixTime * 1000);
      if (isNaN(date.getTime())) return null;
      return date.toISOString();
    } catch {
      return null;
    }
  };

  if (subscriptionId) {
    logStep("Retrieving subscription from Stripe", { subscriptionId: redactId(subscriptionId) });
    subscription = await stripe.subscriptions.retrieve(subscriptionId);
    status = subscription.status;
    const priceId = subscription.items.data[0]?.price.id;
    
    // Map price IDs to plans
    if (priceId === 'price_1SIWDPEl2hJeGlFp14plp0D5') plan = 'essentiel';
    else if (priceId === 'price_1SIWFyEl2hJeGlFp8pQyEMQC') plan = 'equilibre';
    else if (priceId === 'price_1SIWGdEl2hJeGlFp1e1pekfL') plan = 'premium';
    else plan = priceId; // Use price ID as fallback

    logStep("Subscription details", { 
      status, 
      plan, 
      hasTrialEnd: !!subscription.trial_end,
      hasPeriodEnd: !!subscription.current_period_end 
    });

    trialEnd = safeTimestamp(subscription.trial_end);
    currentPeriodEnd = safeTimestamp(subscription.current_period_end);
    trialStart = safeTimestamp(subscription.trial_start);
  }

  // Use session created time or current time as trial_start
  if (!trialStart && session?.created) {
    trialStart = safeTimestamp(session.created);
  }
  if (!trialStart) {
    trialStart = new Date().toISOString();
  }

  const upsertData = {
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    status,
    plan,
    trial_start: trialStart,
    trial_end: trialEnd,
    current_period_end: currentPeriodEnd,
    updated_at: new Date().toISOString(),
  };

  logStep("Upserting subscription", { userId: redactId(userId), status, plan });

  const { error: subError } = await supabaseAdmin
    .from('subscriptions')
    .upsert(upsertData, {
      onConflict: 'user_id'
    });

  if (subError) {
    logStep("ERROR upserting subscription", { 
      error: subError.message, 
      code: subError.code,
      details: JSON.stringify(subError)
    });
    throw subError;
  }

  logStep("Subscription record updated successfully", { userId: redactId(userId), plan, status });
}
