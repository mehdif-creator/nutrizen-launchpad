import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
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
    
    let event: Stripe.Event;
    
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } else {
      event = JSON.parse(body);
    }

    logStep("Event type", { type: event.type });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Handle checkout.session.completed - Create user account
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerEmail = session.customer_email || session.customer_details?.email;
      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;

      if (!customerEmail) {
        throw new Error("No customer email found");
      }

      logStep("Creating user account", { email: customerEmail, customerId });

      // Create a random password for the user
      const randomPassword = crypto.randomUUID();

      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: customerEmail,
        password: randomPassword,
        email_confirm: true,
        user_metadata: {
          stripe_customer_id: customerId,
        },
      });

      if (authError) {
        if (authError.message.includes("already registered")) {
          logStep("User already exists", { email: customerEmail });
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
        logStep("User created successfully", { userId: authData.user.id });
        await updateSubscriptionRecord(supabaseAdmin, authData.user.id, customerId, subscriptionId, session, stripe);
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
    if (priceId === 'price_1QdB8TRtL2BrODRjO7lUPApe') plan = 'essentiel';
    else if (priceId === 'price_1QdB9VRtL2BrODRjT5kIEBzV') plan = 'equilibre';
    else if (priceId === 'price_1QdBAgRtL2BrODRjWpLJCVBk') plan = 'premium';

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

  logStep("Subscription record updated", { userId, plan, status });
}
