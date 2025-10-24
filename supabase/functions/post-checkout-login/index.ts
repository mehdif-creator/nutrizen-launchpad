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

// Generate a secure password that meets Supabase's password policy
// Requirements: lowercase, uppercase, digits, and special characters
const generateSecurePassword = (): string => {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}';
  
  // Ensure at least one character from each required category
  const password = [
    lowercase[Math.floor(Math.random() * lowercase.length)],
    uppercase[Math.floor(Math.random() * uppercase.length)],
    digits[Math.floor(Math.random() * digits.length)],
    special[Math.floor(Math.random() * special.length)],
  ];
  
  // Fill the rest with random characters from all categories
  const allChars = lowercase + uppercase + digits + special;
  for (let i = password.length; i < 32; i++) {
    password.push(allChars[Math.floor(Math.random() * allChars.length)]);
  }
  
  // Shuffle the password to randomize character positions
  return password.sort(() => Math.random() - 0.5).join('');
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

    // Initialize Supabase Admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // SECURITY: Check if session has already been processed (prevent replay attacks)
    logStep("Checking if session was already processed");
    const { data: existingSession, error: checkError } = await supabaseAdmin
      .from('processed_checkout_sessions')
      .select('user_id, processed_at')
      .eq('session_id', sessionId)
      .maybeSingle();

    if (checkError) {
      logStep("ERROR checking processed sessions", { error: checkError.message });
      throw new Error("Database error checking session status");
    }

    if (existingSession) {
      logStep("Session already processed, redirecting to login", { 
        processedAt: existingSession.processed_at 
      });
      const appBaseUrl = Deno.env.get("APP_BASE_URL") || "https://app.mynutrizen.fr";
      const loginUrl = `${appBaseUrl}/auth/login?message=session_already_used`;
      
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          "Location": loginUrl,
        },
      });
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { 
      apiVersion: "2025-08-27.basil" 
    });

    // Retrieve checkout session
    logStep("Retrieving checkout session from Stripe");
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    // SECURITY: Verify payment was completed
    if (session.payment_status !== 'paid') {
      logStep("ERROR: Payment not completed", { status: session.payment_status });
      throw new Error("Payment not completed");
    }

    // SECURITY: Check session age (only accept sessions from last 24 hours)
    const sessionCreated = new Date(session.created * 1000);
    const now = new Date();
    const hoursSinceCreation = (now.getTime() - sessionCreated.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceCreation > 24) {
      logStep("ERROR: Session too old", { hoursSinceCreation });
      throw new Error("Checkout session expired");
    }

    if (!session.customer_details?.email) {
      throw new Error("No email found in checkout session");
    }
    
    const email = session.customer_details.email;
    logStep("Email retrieved from session", { email: email.substring(0, 3) + "***" });

    // Generate signup link WITHOUT sending email (creates user automatically)
    logStep("Generating signup link (no email send)");
    const appBaseUrl = Deno.env.get("APP_BASE_URL") || "https://app.mynutrizen.fr";
    const redirectTo = `${appBaseUrl}/auth/callback?from_checkout=true`;
    
    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);
    
    let linkData;
    let linkError;
    
    if (existingUser) {
      // User exists, generate magic link for login instead
      logStep("User already exists, generating magic link for login");
      const result = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: {
          redirectTo,
        }
      });
      linkData = result.data;
      linkError = result.error;
    } else {
      // New user, generate signup link
      logStep("New user, generating signup link");
      const result = await supabaseAdmin.auth.admin.generateLink({
        type: 'signup',
        email,
        password: generateSecurePassword(), // Secure password that meets policy requirements
        options: {
          redirectTo,
        }
      });
      linkData = result.data;
      linkError = result.error;
    }

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
    const userId = linkData.user?.id || existingUser?.id;
    
    logStep("Magic link generated successfully", { 
      hasLink: !!actionLink,
      userId: userId ? userId.substring(0, 8) + "***" : "unknown",
      linkPrefix: actionLink.substring(0, 50) + "...",
      isExistingUser: !!existingUser
    });

    // SECURITY: Record this session as processed (prevent replay attacks)
    if (userId) {
      logStep("Recording processed session");
      const { error: insertError } = await supabaseAdmin
        .from('processed_checkout_sessions')
        .insert({
          session_id: sessionId,
          user_id: userId,
          payment_status: session.payment_status,
        });

      if (insertError) {
        logStep("WARNING: Failed to record processed session", { 
          error: insertError.message 
        });
        // Continue anyway - user creation/login succeeded
      } else {
        logStep("Session recorded successfully");
      }
    } else {
      logStep("WARNING: No user_id available");
    }

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
