import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

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

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  // Helper to log payment events
  const logPaymentEvent = async (
    eventType: string,
    stripeEventId: string | null,
    userId: string | null,
    userEmail: string | null,
    amountCents: number | null,
    creditsAmount: number | null,
    status: string,
    errorMessage: string | null = null,
    metadata: any = {}
  ) => {
    try {
      await supabaseAdmin.from('payment_events_log').insert({
        event_type: eventType,
        stripe_event_id: stripeEventId,
        user_id: userId,
        user_email: userEmail,
        amount_cents: amountCents,
        credits_amount: creditsAmount,
        status,
        error_message: errorMessage,
        metadata,
      });
    } catch (err) {
      console.error('[PAYMENT-LOG] Error logging event:', err);
    }
  };

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
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
      logStep("Stripe event constructed successfully", { eventId: event.id });
    } catch (err) {
      logStep("ERROR: Failed to construct Stripe event", { error: String(err) });
      throw err;
    }

    logStep("Event type", { type: event.type, eventId: event.id });

    // IDEMPOTENCY CHECK: prevent duplicate processing
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

    // Handle checkout.session.completed - Credits purchase OR Subscription
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerEmail = session.customer_email || session.customer_details?.email;
      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;
      
      // Check if this is a credit pack purchase
      const isCreditPurchase = session.metadata?.product_role === 'zen_credits_pack' || 
                               session.metadata?.credits_type === 'lifetime' ||
                               session.metadata?.pack_id;
      const creditsAmount = session.metadata?.credits_amount ? parseInt(session.metadata.credits_amount) : null;
      const supabaseUserId = session.metadata?.supabase_user_id;
      const packId = session.metadata?.pack_id;
      
      if (isCreditPurchase && creditsAmount && supabaseUserId) {
        // =========================================
        // CREDITS PURCHASE - Atomic & Idempotent
        // =========================================
        logStep("Processing credit pack purchase", {
          userId: redactId(supabaseUserId),
          credits: creditsAmount,
          packId,
          sessionId: session.id.substring(0, 8) + "***"
        });
        
        // Build stable idempotency key
        const idempotencyKey = `stripe:checkout_session:${session.id}`;
        
        try {
          // Use atomic RPC function
          const { data: creditsResult, error: creditsError } = await supabaseAdmin.rpc('rpc_apply_credit_transaction', {
            p_user_id: supabaseUserId,
            p_type: 'purchase',
            p_amount: creditsAmount,
            p_reason: `Achat pack ${packId || 'credits'} - ${creditsAmount} crédits`,
            p_reference_type: 'stripe_checkout_session',
            p_reference_id: session.id,
            p_idempotency_key: idempotencyKey,
            p_feature: null,
          });
          
          if (creditsError) {
            logStep("ERROR adding credits via RPC", { error: creditsError.message });
            await logPaymentEvent(
              'credits_purchase_failed',
              event.id,
              supabaseUserId,
              customerEmail,
              session.amount_total,
              creditsAmount,
              'error',
              creditsError.message,
              { session_id: session.id, pack_id: packId }
            );
            throw creditsError;
          }
          
          // Check if this was an idempotent hit (already processed)
          if (creditsResult?.idempotent_hit) {
          logStep("Idempotent hit - transaction already processed", { 
              transactionId: creditsResult.transaction_id 
            });
            return new Response(JSON.stringify({ received: true, idempotent: true }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 200,
            });
          }
          
          logStep("Credits added successfully", { 
            subscriptionBalance: creditsResult.subscription_balance,
            lifetimeBalance: creditsResult.lifetime_balance,
            totalBalance: creditsResult.total_balance
          });
          
          // Log successful payment event
          await logPaymentEvent(
            'credits_purchase_success',
            event.id,
            supabaseUserId,
            customerEmail,
            session.amount_total,
            creditsAmount,
            'success',
            null,
            { 
              session_id: session.id, 
              pack_id: packId,
              new_balance: creditsResult.total_balance 
            }
          );
          
          // =========================================
          // REFERRAL QUALIFICATION - First credits purchase
          // =========================================
          // Check if this user was referred and trigger qualification
          try {
            const { data: qualResult, error: qualError } = await supabaseAdmin.rpc('handle_referral_qualification', {
              p_referred_user_id: supabaseUserId,
              p_reference_type: 'stripe_checkout_session',
              p_reference_id: session.id,
            });
            
            if (qualError) {
              logStep("Referral qualification check failed (non-blocking)", { error: qualError.message });
            } else if (qualResult?.success) {
              logStep("Referral qualification processed", { 
                rewardCredits: qualResult.reward_credits,
                alreadyQualified: qualResult.already_qualified 
              });
            }
          } catch (refErr) {
            logStep("Referral qualification error (non-blocking)", { error: String(refErr) });
          }
          
          return new Response(JSON.stringify({ received: true, credits_added: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        } catch (error) {
          logStep("CRITICAL ERROR processing credit purchase", { error: String(error) });
          throw error;
        }
      }
      
      // =========================================
      // SUBSCRIPTION HANDLING (legacy, when enabled)
      // =========================================
      const referralCode = session.metadata?.referral_code;
      const fromCheckout = session.metadata?.from_checkout === 'true';

      if (!customerEmail) {
        throw new Error("No customer email found");
      }

      logStep("Processing subscription checkout for customer", { 
        email: redactEmail(customerEmail), 
        customerId: redactId(customerId),
        subscriptionId: redactId(subscriptionId),
        referralCode: referralCode ? '[REDACTED]' : null,
        fromCheckout 
      });

      const randomPassword = crypto.randomUUID();

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
        logStep("Updating subscription for existing user");
        await updateSubscriptionRecord(supabaseAdmin, userId, customerId, subscriptionId, session, stripe);
      } else {
        logStep("Creating new user in Supabase Auth", { email: redactEmail(customerEmail) });
        
        try {
          const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: customerEmail,
            password: randomPassword,
            email_confirm: true,
            user_metadata: {
              stripe_customer_id: customerId,
              created_via_stripe: true,
            },
          });

          if (authError) {
            logStep("ERROR creating user in Supabase Auth", { 
              error: authError.message,
              code: authError.status,
            });
            throw authError;
          }
          
          if (!authData.user) {
            logStep("ERROR: User creation returned no user data");
            throw new Error("User creation failed - no user data returned");
          }
          
          userId = authData.user.id;
          logStep("User created successfully in Supabase Auth", { userId: redactId(userId) });
          
          await new Promise(resolve => setTimeout(resolve, 500));
          
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
      
      // Create one-time login token
      if (userId && session.id) {
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
        
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
          logStep("One-time login token created");
        }
      }
        
      // Handle referral
      const refCode = session.metadata?.referral_code;
      const affCode = session.metadata?.affiliate_code;
      
      if (referralCode && userId) {
        logStep("Processing referral signup and subscription reward");
          
        try {
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
      
      // Handle affiliate tracking
      if (affCode && userId && subscriptionId) {
        logStep("Processing affiliate conversion", { affiliateCode: redactId(affCode) });
        try {
          const { data: affiliateProfile } = await supabaseAdmin
            .from('user_profiles')
            .select('id')
            .eq('affiliate_code', affCode)
            .eq('is_affiliate', true)
            .single();
          
          if (affiliateProfile) {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            const amountRecurring = subscription.items.data[0].price.unit_amount || 0;
            
            await supabaseAdmin
              .from('affiliate_conversions')
              .insert({
                affiliate_user_id: affiliateProfile.id,
                referred_user_id: userId,
                stripe_subscription_id: subscriptionId,
                commission_rate: 0.04,
                amount_recurring: amountRecurring / 100,
                status: 'active',
              });
            
            logStep("Affiliate conversion tracked successfully");
          }
        } catch (affError) {
          logStep("Affiliate tracking error", { error: String(affError) });
        }
      }
    }

    // Handle charge.refunded - Reverse credits if needed
    if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge;
      const refunds = charge.refunds?.data || [];
      
      for (const refund of refunds) {
        const idempotencyKey = `stripe:refund:${refund.id}`;
        
        // Check if this was a credits purchase refund via payment intent metadata
        // Note: You may need to look up the original transaction
        logStep("Processing refund", { 
          refundId: refund.id, 
          amount: refund.amount,
          chargeId: charge.id 
        });
        
        // Log refund event for admin review
        await logPaymentEvent(
          'refund_received',
          event.id,
          null,
          charge.billing_details?.email,
          refund.amount,
          null,
          'pending_review',
          null,
          { 
            refund_id: refund.id, 
            charge_id: charge.id,
            reason: refund.reason 
          }
        );
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
    
    if (priceId === 'price_1SIWDPEl2hJeGlFp14plp0D5') plan = 'essentiel';
    else if (priceId === 'price_1SIWFyEl2hJeGlFp8pQyEMQC') plan = 'equilibre';
    else if (priceId === 'price_1SIWGdEl2hJeGlFp1e1pekfL') plan = 'premium';
    else plan = priceId;

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
    });
    throw subError;
  }

  logStep("Subscription record updated successfully", { userId: redactId(userId), plan, status });
}
