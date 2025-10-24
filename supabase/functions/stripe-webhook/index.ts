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
    logStep("Webhook received");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      throw new Error("No stripe signature found");
    }

    const body = await req.text();
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!webhookSecret) {
      throw new Error("STRIPE_WEBHOOK_SECRET not configured");
    }
    
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

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

    // Handle checkout.session.completed - Create user account
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerEmail = session.customer_email || session.customer_details?.email;
      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;
      
      // Get referral code from session metadata if it exists
      const referralCode = session.metadata?.referral_code;

      if (!customerEmail) {
        throw new Error("No customer email found");
      }

      logStep("Creating user account", { 
        email: redactEmail(customerEmail), 
        customerId: redactId(customerId),
        referralCode: referralCode ? '[REDACTED]' : null 
      });

      // Create a random password for the user
      const randomPassword = crypto.randomUUID();

      // Create user in Supabase Auth - email_confirm: true to skip default email
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: customerEmail,
        password: randomPassword,
        email_confirm: true, // Skip default confirmation email - we'll send magic link
        user_metadata: {
          stripe_customer_id: customerId,
        },
      });

      if (authError) {
        if (authError.message.includes("already registered")) {
          logStep("User already exists", { email: redactEmail(customerEmail) });
          // Update existing subscription
          const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
          const user = existingUser.users.find(u => u.email === customerEmail);
          
          if (user) {
            await updateSubscriptionRecord(supabaseAdmin, user.id, customerId, subscriptionId, session, stripe);
          }
        } else {
          throw authError;
        }
      } else if (authData.user) {
        logStep("User created successfully", { userId: redactId(authData.user.id) });
        await updateSubscriptionRecord(supabaseAdmin, authData.user.id, customerId, subscriptionId, session, stripe);
        
        // Generate and send magic link for login
        const appBaseUrl = Deno.env.get("APP_BASE_URL") || "https://mynutrizen.fr";
        logStep("Generating magic link", { email: redactEmail(customerEmail), redirectTo: `${appBaseUrl}/app` });
        
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'magiclink',
          email: customerEmail,
          options: {
            redirectTo: `${appBaseUrl}/app`,
          },
        });
        
        if (linkError) {
          logStep("ERROR generating magic link", { error: linkError.message });
        } else {
          logStep("Magic link generated successfully", { 
            hasActionLink: !!linkData.properties?.action_link 
          });
          
          // Send email via n8n webhook
          const n8nWebhookBase = Deno.env.get("N8N_WEBHOOK_BASE");
          if (n8nWebhookBase && linkData.properties?.action_link) {
            try {
              const emailResponse = await fetch(`${n8nWebhookBase}/welcome-email`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  email: customerEmail,
                  magicLink: linkData.properties.action_link,
                  name: customerEmail.split('@')[0],
                }),
              });
              
              if (emailResponse.ok) {
                logStep("Welcome email sent successfully");
              } else {
                logStep("Failed to send welcome email", { status: emailResponse.status });
              }
            } catch (emailError) {
              logStep("Error sending welcome email", { error: emailError });
            }
          }
        }
        
        // Handle referral if present
        if (referralCode) {
          logStep("Processing referral", { 
            referralCode: '[REDACTED]', 
            newUserId: redactId(authData.user.id) 
          });
          
          try {
            // Call handle-referral function
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
                  newUserId: authData.user.id,
                }),
              }
            );
            
            if (referralResponse.ok) {
              logStep("Referral processed successfully");
            } else {
              logStep("Referral processing failed", { status: referralResponse.status });
            }
          } catch (referralError) {
            logStep("Referral processing error", { error: referralError });
            // Don't fail the whole process if referral fails
          }
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

  if (subscriptionId) {
    subscription = await stripe.subscriptions.retrieve(subscriptionId);
    status = subscription.status;
    const priceId = subscription.items.data[0]?.price.id;
    
    // Map price IDs to plans
    if (priceId === 'price_1SIWDPEl2hJeGlFp14plp0D5') plan = 'essentiel';
    else if (priceId === 'price_1SIWFyEl2hJeGlFp8pQyEMQC') plan = 'equilibre';
    else if (priceId === 'price_1SIWGdEl2hJeGlFp1e1pekfL') plan = 'premium';

    if (subscription.trial_end) {
      trialEnd = new Date(subscription.trial_end * 1000).toISOString();
    }
    currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
  }

  const { error: subError } = await supabaseAdmin
    .from('subscriptions')
    .upsert({
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      status,
      plan,
      trial_start: session?.created ? new Date(session.created * 1000).toISOString() : null,
      trial_end: trialEnd,
      current_period_end: currentPeriodEnd,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id'
    });

  if (subError) {
    throw subError;
  }

  logStep("Subscription record updated", { userId: redactId(userId), plan, status });
}
