import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from '../_shared/deps.ts';
import { getSecurityHeaders } from '../_shared/security.ts';

const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const redactEmail = (email: string): string => {
  const [user, domain] = email.split('@');
  return `${user.slice(0, 2)}***@${domain}`;
};

const redactId = (id: string): string => id ? `${id.slice(0, 8)}***` : '[NONE]';

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

// ── Plan metadata lookup from Stripe price metadata ──
interface PlanMeta {
  tier: string;
  credits_monthly: number;
  rollover_cap: number;
  priority_generation: boolean;
  topup_discount_pct: number;
}

async function getPlanMetaFromPrice(stripe: Stripe, priceId: string): Promise<PlanMeta | null> {
  try {
    const price = await stripe.prices.retrieve(priceId, { expand: ['product'] });
    const meta = price.metadata || {};
    if (!meta.plan_tier) return null;
    return {
      tier: meta.plan_tier,
      credits_monthly: parseInt(meta.credits_monthly || '0'),
      rollover_cap: parseInt(meta.rollover_cap || '0'),
      priority_generation: meta.priority_generation === 'true',
      topup_discount_pct: parseInt(meta.topup_discount_pct || '0'),
    };
  } catch {
    return null;
  }
}

// ── Resolve user WITHOUT listUsers ──
async function resolveUserId(
  supabaseAdmin: any,
  opts: {
    metadataUserId?: string | null;
    clientReferenceId?: string | null;
    stripeCustomerId?: string | null;
    customerEmail?: string | null;
  }
): Promise<string | null> {
  const directId = opts.metadataUserId || opts.clientReferenceId;
  if (directId) {
    logStep("Resolved user via metadata/client_reference_id", { userId: redactId(directId) });
    return directId;
  }

  if (opts.stripeCustomerId) {
    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('user_id')
      .eq('stripe_customer_id', opts.stripeCustomerId)
      .limit(1)
      .maybeSingle();
    if (sub?.user_id) return sub.user_id;

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', opts.stripeCustomerId)
      .limit(1)
      .maybeSingle();
    if (profile?.id) return profile.id;
  }

  if (opts.customerEmail) {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', opts.customerEmail)
      .limit(1)
      .maybeSingle();
    if (profile?.id) return profile.id;
  }

  logStep("WARN: Could not resolve user");
  return null;
}

Deno.serve(async (req) => {
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
    eventType: string, stripeEventId: string | null, userId: string | null,
    userEmail: string | null, amountCents: number | null, creditsAmount: number | null,
    status: string, errorMessage: string | null = null, metadata: any = {}
  ) => {
    try {
      await supabaseAdmin.from('payment_events_log').insert({
        event_type: eventType, stripe_event_id: stripeEventId, user_id: userId,
        user_email: userEmail, amount_cents: amountCents, credits_amount: creditsAmount,
        status, error_message: errorMessage, metadata,
      });
    } catch (err) {
      console.error('[PAYMENT-LOG] Error:', err);
    }
  };

  try {
    logStep("Webhook received");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const signature = req.headers.get("stripe-signature");
    if (!signature) throw new Error("No stripe signature");

    const body = await req.text();
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET not configured");

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      logStep("ERROR: Failed to construct event", { error: String(err) });
      throw err;
    }

    logStep("Event type", { type: event.type, eventId: event.id });

    // IDEMPOTENCY CHECK
    const { error: idempotencyError } = await supabaseAdmin
      .from('stripe_events')
      .insert({ event_id: event.id, event_type: event.type });

    if (idempotencyError) {
      if (idempotencyError.code === '23505') {
        logStep("Event already processed, skipping", { eventId: event.id });
        return new Response(JSON.stringify({ received: true, skipped: true }), {
          headers: { ...corsHeaders, ...getSecurityHeaders(), "Content-Type": "application/json" },
          status: 200,
        });
      }
      logStep("WARN: Idempotency check error, proceeding", { error: idempotencyError.message });
    }

    // =========================================
    // checkout.session.completed
    // =========================================
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerEmail = session.customer_email || session.customer_details?.email;
      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;

      // ── TOP-UP PURCHASE (mode=payment) ──
      if (session.mode === 'payment' && session.payment_status === 'paid') {
        const topupCredits = session.metadata?.topup_credits
          ? parseInt(session.metadata.topup_credits)
          : (session.metadata?.credits_amount ? parseInt(session.metadata.credits_amount) : null);
        const supabaseUserId = session.metadata?.supabase_user_id || session.metadata?.user_id || session.client_reference_id;

        if (topupCredits && supabaseUserId) {
          logStep("Processing top-up purchase", { userId: redactId(supabaseUserId), credits: topupCredits });

          if (customerId) {
            await supabaseAdmin.from('profiles').update({ stripe_customer_id: customerId }).eq('id', supabaseUserId);
          }

          const idempotencyKey = `stripe:checkout_session:${session.id}`;
          const { data: creditsResult, error: creditsError } = await supabaseAdmin.rpc('rpc_apply_credit_transaction', {
            p_user_id: supabaseUserId,
            p_type: 'purchase',
            p_amount: topupCredits,
            p_reason: `Achat pack ${session.metadata?.pack_id || 'credits'} - ${topupCredits} crédits`,
            p_reference_type: 'stripe_checkout_session',
            p_reference_id: session.id,
            p_idempotency_key: idempotencyKey,
            p_feature: null,
          });

          if (creditsError) {
            logStep("ERROR adding credits", { error: creditsError.message });
            await logPaymentEvent('credits_purchase_failed', event.id, supabaseUserId, customerEmail, session.amount_total, topupCredits, 'error', creditsError.message);
            throw creditsError;
          }

          if (creditsResult?.idempotent_hit) {
            logStep("Idempotent hit - already processed");
            return okResponse(corsHeaders);
          }

          logStep("Credits added successfully", { balance: creditsResult.total_balance });
          await logPaymentEvent('credits_purchase_success', event.id, supabaseUserId, customerEmail, session.amount_total, topupCredits, 'success');

          return okResponse(corsHeaders);
        }
      }

      // ── SUBSCRIPTION CHECKOUT ──
      if (session.mode === 'subscription' && subscriptionId) {
        if (!customerEmail) throw new Error("No customer email found");

        let userId = await resolveUserId(supabaseAdmin, {
          metadataUserId: session.metadata?.user_id,
          clientReferenceId: session.client_reference_id,
          stripeCustomerId: customerId,
          customerEmail,
        });

        if (!userId) {
          logStep("Creating new user");
          const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: customerEmail,
            password: crypto.randomUUID(),
            email_confirm: true,
            user_metadata: { stripe_customer_id: customerId, created_via_stripe: true },
          });
          if (authError || !authData.user) throw authError || new Error("User creation failed");
          userId = authData.user.id;
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        if (customerId && userId) {
          await supabaseAdmin.from('profiles').update({ stripe_customer_id: customerId }).eq('id', userId);
        }

        // Update subscription record + plan_tier on profile
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = sub.items.data[0]?.price.id;
        const planMeta = await getPlanMetaFromPrice(stripe, priceId);

        await updateSubscriptionRecord(supabaseAdmin, userId, customerId, subscriptionId, sub);

        if (planMeta) {
          await supabaseAdmin.from('profiles').update({ plan_tier: planMeta.tier }).eq('id', userId);
          await supabaseAdmin.from('user_wallets')
            .upsert({
              user_id: userId,
              rollover_cap: planMeta.rollover_cap,
              current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
              current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            }, { onConflict: 'user_id' });
        }

        // Grant welcome credits (once)
        await supabaseAdmin.rpc('grant_welcome_credits', { p_user_id: userId });

        // Handle checkout_token
        const checkoutToken = session.metadata?.checkout_token;
        if (checkoutToken) {
          await supabaseAdmin.from('checkout_tokens')
            .update({ status: 'ready', user_id: userId, stripe_session_id: session.id })
            .eq('token', checkoutToken)
            .eq('status', 'pending');
        }

        // Handle referral
        const referralCode = session.metadata?.referral_code;
        if (referralCode && userId) {
          try {
            await supabaseAdmin.rpc('handle_referred_user_subscribed', {
              p_referred_user_id: userId,
              p_referral_code: referralCode,
            });
          } catch (e) {
            logStep("Referral error (non-blocking)", { error: String(e) });
          }
        }

        // Trigger Brevo onboarding sequence (non-blocking)
        if (userId) {
          try {
            const planTier = planMeta?.tier || 'starter';
            const planName = planTier === 'premium' ? 'Premium' : 'Starter';
            const brevoUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/brevo-onboarding`;
            await fetch(brevoUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${serviceRoleKey}`,
              },
              body: JSON.stringify({
                action: 'trigger_sequence',
                user_id: userId,
                plan_name: planName,
              }),
            });
            logStep("Brevo onboarding triggered", { userId: redactId(userId), planName });
          } catch (e) {
            logStep("Brevo onboarding error (non-blocking)", { error: String(e) });
          }
        }
      }
    }

    // =========================================
    // invoice.paid — CRITICAL: billing_reason-based logic
    // =========================================
    if (event.type === "invoice.paid") {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;
      const billingReason = invoice.billing_reason;
      const subscriptionId = invoice.subscription as string;

      logStep("invoice.paid", { billingReason, subscriptionId: redactId(subscriptionId || '') });

      const userId = await resolveUserId(supabaseAdmin, { stripeCustomerId: customerId });
      if (!userId) {
        logStep("WARN: Cannot resolve user for invoice.paid");
        return okResponse(corsHeaders);
      }

      // ── AFFILIATE COMMISSION (runs on every invoice.paid with a subscription) ──
      if (subscriptionId && invoice.amount_paid && invoice.amount_paid > 0) {
        try {
          // Check if this user was referred by an affiliate
          const { data: referral } = await supabaseAdmin
            .from('affiliate_referrals')
            .select('affiliate_code, converted')
            .eq('referred_user_id', userId)
            .limit(1)
            .maybeSingle();

          if (referral) {
            // Insert commission (idempotent via unique stripe_invoice_id)
            const commissionCents = Math.round(invoice.amount_paid * 0.20);
            const { error: commError } = await supabaseAdmin
              .from('affiliate_commissions')
              .upsert({
                affiliate_code: referral.affiliate_code,
                referred_user_id: userId,
                stripe_invoice_id: invoice.id,
                subscription_amount_cents: invoice.amount_paid,
                commission_amount_cents: commissionCents,
                status: 'pending',
              }, { onConflict: 'stripe_invoice_id' });

            if (commError) {
              logStep("WARN: Affiliate commission insert error", { error: commError.message });
            } else {
              logStep("Affiliate commission recorded", { code: referral.affiliate_code, amount: commissionCents });
            }

            // Mark as converted on first payment
            if (!referral.converted) {
              await supabaseAdmin
                .from('affiliate_referrals')
                .update({ converted: true, stripe_customer_id: customerId })
                .eq('referred_user_id', userId)
                .eq('affiliate_code', referral.affiliate_code);
              logStep("Affiliate referral marked as converted");
            }
          }
        } catch (affErr) {
          logStep("WARN: Affiliate commission error (non-blocking)", { error: String(affErr) });
        }
      }

      if (billingReason === 'subscription_create' || billingReason === 'subscription_cycle') {
        // ── MONTHLY REFILL ──
        if (!subscriptionId) {
          logStep("No subscriptionId on invoice, skipping refill");
          return okResponse(corsHeaders);
        }

        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = sub.items.data[0]?.price.id;
        const planMeta = await getPlanMetaFromPrice(stripe, priceId);

        if (!planMeta) {
          logStep("WARN: No plan metadata on price, skipping refill");
          return okResponse(corsHeaders);
        }

        const periodStart = new Date(sub.current_period_start * 1000).toISOString();
        const periodEnd = new Date(sub.current_period_end * 1000).toISOString();

        // Get current balance for rollover calc
        const { data: wallet } = await supabaseAdmin
          .from('user_wallets')
          .select('subscription_credits, lifetime_credits')
          .eq('user_id', userId)
          .single();

        // CRITICAL: Rollover carry uses ONLY subscription_credits, NOT lifetime_credits
        // lifetime_credits are perpetual purchased credits and must never be mixed into rollover
        const currentSubscriptionCredits = wallet?.subscription_credits || 0;
        const carry = Math.min(currentSubscriptionCredits, planMeta.rollover_cap);
        const newBalance = carry + planMeta.credits_monthly;

        // Idempotent insert
        const { error: txError } = await supabaseAdmin.from('credit_transactions').insert({
          user_id: userId,
          delta: planMeta.credits_monthly,
          reason: 'subscription_refill',
          credit_type: 'subscription',
          stripe_event_id: event.id,
          stripe_invoice_id: invoice.id,
          period_start: periodStart,
          period_end: periodEnd,
          metadata: { carry, plan_tier: planMeta.tier, credits_monthly: planMeta.credits_monthly },
        });

        if (txError) {
          if (txError.code === '23505') {
            logStep("Refill already processed (idempotent)");
            return okResponse(corsHeaders);
          }
          throw txError;
        }

        // Update wallet
        await supabaseAdmin.from('user_wallets').upsert({
          user_id: userId,
          subscription_credits: newBalance,
          lifetime_credits: wallet?.lifetime_credits || 0,
          credits_total: newBalance + (wallet?.lifetime_credits || 0),
          balance: newBalance + (wallet?.lifetime_credits || 0),
          balance_allowance: newBalance,
          balance_purchased: wallet?.lifetime_credits || 0,
          rollover_cap: planMeta.rollover_cap,
          current_period_start: periodStart,
          current_period_end: periodEnd,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

        // Update profile plan_tier
        await supabaseAdmin.from('profiles').update({
          plan_tier: planMeta.tier,
        }).eq('id', userId);

        // Update subscription record
        await updateSubscriptionRecord(supabaseAdmin, userId, customerId, subscriptionId, sub);

        logStep("Monthly refill completed", { carry, newBalance, tier: planMeta.tier });

      } else if (billingReason === 'subscription_update') {
        // ── PRORATION INVOICE (upgrade) ──
        if (!subscriptionId || !invoice.amount_paid || invoice.amount_paid <= 0) {
          logStep("Proration invoice with 0 amount or no sub, skipping");
          return okResponse(corsHeaders);
        }

        // STRICT upgrade detection: require proration line with premium price metadata
        const lines = invoice.lines?.data || [];
        let prorationPriceId: string | null = null;
        for (const line of lines) {
          if (line.proration && line.price?.id) {
            prorationPriceId = line.price.id;
            break;
          }
        }

        if (!prorationPriceId) {
          logStep("No proration line found, skipping delta credit");
          return okResponse(corsHeaders);
        }

        // Verify the proration target is actually premium via price metadata
        const prorationPlanMeta = await getPlanMetaFromPrice(stripe, prorationPriceId);
        if (!prorationPlanMeta || prorationPlanMeta.tier !== 'premium') {
          logStep("Proration line is not for premium tier, skipping", { priceId: prorationPriceId });
          return okResponse(corsHeaders);
        }

        // Verify user was NOT already premium (prevent re-granting on non-upgrade updates)
        const { data: profileBefore } = await supabaseAdmin
          .from('profiles')
          .select('plan_tier')
          .eq('id', userId)
          .single();

        if (profileBefore?.plan_tier === 'premium') {
          logStep("User already premium, not an upgrade — skipping delta", { currentTier: profileBefore.plan_tier });
          return okResponse(corsHeaders);
        }

        // Get old plan credits from DB subscription's current price or fallback to starter metadata
        const { data: oldSub } = await supabaseAdmin
          .from('subscriptions')
          .select('plan')
          .eq('user_id', userId)
          .single();

        let oldCreditsMonthly = 80; // default starter
        if (oldSub?.plan) {
          const oldPlanMeta = await getPlanMetaFromPrice(stripe, oldSub.plan);
          if (oldPlanMeta) oldCreditsMonthly = oldPlanMeta.credits_monthly;
        }

        const newCreditsMonthly = prorationPlanMeta.credits_monthly;

        // Retrieve the subscription for period calculation
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        const periodStart = sub.current_period_start;
        const periodEnd = sub.current_period_end;
        const now = Math.floor(Date.now() / 1000);
        const remainingRatio = Math.max(0, Math.min(1, (periodEnd - now) / (periodEnd - periodStart)));
        const maxDelta = newCreditsMonthly - oldCreditsMonthly;
        const delta = Math.min(
          Math.ceil(maxDelta * remainingRatio),
          maxDelta
        );

        if (delta <= 0) {
          logStep("Prorated delta is 0, skipping");
          return okResponse(corsHeaders);
        }

        // Idempotent insert
        const { error: txError } = await supabaseAdmin.from('credit_transactions').insert({
          user_id: userId,
          delta,
          reason: 'plan_upgrade_prorated',
          credit_type: 'subscription',
          stripe_event_id: event.id,
          stripe_invoice_id: invoice.id,
          metadata: { from_tier: profileBefore?.plan_tier || 'starter', to_tier: 'premium', old_credits: oldCreditsMonthly, new_credits: newCreditsMonthly, remaining_ratio: remainingRatio, delta },
        });

        if (txError) {
          if (txError.code === '23505') {
            logStep("Upgrade delta already processed");
            return okResponse(corsHeaders);
          }
          throw txError;
        }

        // Update wallet
        const { data: wallet } = await supabaseAdmin
          .from('user_wallets')
          .select('subscription_credits, lifetime_credits')
          .eq('user_id', userId)
          .single();

        const newSub = (wallet?.subscription_credits || 0) + delta;
        await supabaseAdmin.from('user_wallets').update({
          subscription_credits: newSub,
          credits_total: newSub + (wallet?.lifetime_credits || 0),
          balance: newSub + (wallet?.lifetime_credits || 0),
          balance_allowance: newSub,
          rollover_cap: planMeta.rollover_cap,
          updated_at: new Date().toISOString(),
        }).eq('user_id', userId);

        // Update profile tier
        await supabaseAdmin.from('profiles').update({ plan_tier: 'premium' }).eq('id', userId);

        // Update subscription record
        await updateSubscriptionRecord(supabaseAdmin, userId, customerId, subscriptionId, sub);

        logStep("Upgrade prorated delta granted", { delta, tier: 'premium' });
      }
    }

    // =========================================
    // invoice.payment_failed
    // =========================================
    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;
      const subscriptionId = invoice.subscription as string;

      const userId = await resolveUserId(supabaseAdmin, { stripeCustomerId: customerId });
      if (userId && subscriptionId) {
        await supabaseAdmin.from('subscriptions').update({
          status: 'past_due',
          updated_at: new Date().toISOString(),
        }).eq('user_id', userId);

        logStep("Payment failed, subscription marked past_due", { userId: redactId(userId) });
      }
    }

    // =========================================
    // customer.subscription.updated / deleted
    // =========================================
    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      const userId = await resolveUserId(supabaseAdmin, { stripeCustomerId: customerId });
      if (userId) {
        await updateSubscriptionRecord(supabaseAdmin, userId, customerId, subscription.id, subscription);

        // If deleted, reset plan_tier to free
        if (event.type === "customer.subscription.deleted") {
          await supabaseAdmin.from('profiles').update({ plan_tier: 'free' }).eq('id', userId);
        } else {
          // Update plan_tier based on current price
          const priceId = subscription.items.data[0]?.price.id;
          if (priceId) {
            const planMeta = await getPlanMetaFromPrice(stripe, priceId);
            if (planMeta) {
              await supabaseAdmin.from('profiles').update({ plan_tier: planMeta.tier }).eq('id', userId);
              await supabaseAdmin.from('user_wallets').update({
                rollover_cap: planMeta.rollover_cap,
              }).eq('user_id', userId);
            }
          }
        }
      }
    }

    // =========================================
    // charge.refunded
    // =========================================
    if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge;
      await logPaymentEvent('refund_received', event.id, null, charge.billing_details?.email, charge.amount_refunded, null, 'pending_review');
    }

    return okResponse(corsHeaders);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: "Webhook processing failed" }), {
      headers: { ...corsHeaders, ...getSecurityHeaders(), "Content-Type": "application/json" },
      status: 400,
    });
  }
});

function okResponse(corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify({ received: true }), {
    headers: { ...corsHeaders, ...getSecurityHeaders(), "Content-Type": "application/json" },
    status: 200,
  });
}

async function updateSubscriptionRecord(
  supabaseAdmin: any,
  userId: string,
  customerId: string,
  subscriptionId: string,
  subscription: Stripe.Subscription
) {
  const safeTimestamp = (unixTime: number | null | undefined): string | null => {
    if (!unixTime || typeof unixTime !== 'number') return null;
    try {
      const date = new Date(unixTime * 1000);
      if (isNaN(date.getTime())) return null;
      return date.toISOString();
    } catch { return null; }
  };

  const status = subscription.status;
  const priceId = subscription.items.data[0]?.price.id;

  const upsertData = {
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    status,
    plan: priceId,
    trial_start: safeTimestamp(subscription.trial_start),
    trial_end: safeTimestamp(subscription.trial_end),
    current_period_end: safeTimestamp(subscription.current_period_end),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabaseAdmin
    .from('subscriptions')
    .upsert(upsertData, { onConflict: 'user_id' });

  if (error) {
    logStep("ERROR upserting subscription", { error: error.message });
    throw error;
  }

  logStep("Subscription record updated", { userId: redactId(userId), status });
}
