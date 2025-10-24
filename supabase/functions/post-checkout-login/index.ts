import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("session_id");

    console.log("[POST-CHECKOUT-LOGIN] Session ID:", sessionId);

    if (!sessionId) {
      throw new Error("No session_id provided");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get token from login_tokens table using session_id
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('login_tokens')
      .select('*')
      .eq('session_id', sessionId)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (tokenError || !tokenData) {
      console.log("[POST-CHECKOUT-LOGIN] Invalid or expired token");
      return new Response(null, {
        status: 303,
        headers: {
          "Location": `${Deno.env.get("APP_BASE_URL") || "https://mynutrizen.fr"}/auth/login?error=session_expired`,
        },
      });
    }

    const email = tokenData.email;
    console.log("[POST-CHECKOUT-LOGIN] Valid token for:", email);

    // Delete used token
    await supabaseAdmin
      .from('login_tokens')
      .delete()
      .eq('id', tokenData.id);

    // Generate magic link for auto-login
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: `${Deno.env.get("APP_BASE_URL") || "https://mynutrizen.fr"}/app`,
      },
    });

    if (linkError || !linkData.properties?.action_link) {
      console.error("[POST-CHECKOUT-LOGIN] Failed to generate login link:", linkError);
      throw new Error("Failed to generate login link");
    }

    console.log("[POST-CHECKOUT-LOGIN] Auto-login successful for", email);

    // Redirect to the magic link (auto-login)
    return new Response(null, {
      status: 303,
      headers: {
        "Location": linkData.properties.action_link,
      },
    });

  } catch (error) {
    console.error("[POST-CHECKOUT-LOGIN] Error:", error);
    return new Response(null, {
      status: 303,
      headers: {
        "Location": `${Deno.env.get("APP_BASE_URL") || "https://mynutrizen.fr"}/auth/login?error=login_failed`,
      },
    });
  }
});
