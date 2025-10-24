import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[POST-CHECKOUT-LOGIN] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Get session_id from URL query parameters
    const url = new URL(req.url);
    const sessionId = url.searchParams.get('session_id');
    
    if (!sessionId) {
      throw new Error("session_id parameter is required");
    }
    
    logStep("Session ID received", { sessionId });

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { 
      apiVersion: "2025-08-27.basil" 
    });

    // Retrieve checkout session
    logStep("Retrieving checkout session from Stripe");
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (!session.customer_details?.email) {
      throw new Error("No email found in checkout session");
    }
    
    const email = session.customer_details.email;
    logStep("Email retrieved from session", { email: email.substring(0, 3) + "***" });

    // Initialize Supabase Admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Generate signup link WITHOUT sending email (creates user automatically)
    logStep("Generating signup link (no email send)");
    const appBaseUrl = Deno.env.get("APP_BASE_URL") || "https://app.mynutrizen.fr";
    const redirectTo = `${appBaseUrl}/auth/callback?from_checkout=true`;
    
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email,
      password: crypto.randomUUID(), // Random password since user won't use it
      options: {
        redirectTo,
      }
    });

    if (linkError) {
      logStep("ERROR generating link", { error: linkError.message });
      
      // Fallback: redirect to login with email pre-filled and Google option
      const fallbackUrl = `${appBaseUrl}/post-checkout?session_id=${sessionId}&email=${encodeURIComponent(email)}&fallback=true`;
      logStep("Redirecting to fallback URL", { fallbackUrl });
      
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          "Location": fallbackUrl,
        },
      });
    }

    if (!linkData.properties?.action_link) {
      throw new Error("No action_link generated");
    }

    const actionLink = linkData.properties.action_link;
    logStep("Magic link generated successfully", { 
      hasLink: !!actionLink,
      linkPrefix: actionLink.substring(0, 50) + "..."
    });

    // Redirect user to the magic link (creates session automatically)
    logStep("Redirecting to action link");
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        "Location": actionLink,
      },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    // Redirect to post-checkout page with error
    const appBaseUrl = Deno.env.get("APP_BASE_URL") || "https://app.mynutrizen.fr";
    const errorUrl = `${appBaseUrl}/post-checkout?error=${encodeURIComponent(errorMessage)}`;
    
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        "Location": errorUrl,
      },
    });
  }
});
