import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const appId = Deno.env.get("PINTEREST_APP_ID");
    const redirectUri = Deno.env.get("PINTEREST_REDIRECT_URI");

    if (!appId) {
      return new Response(
        JSON.stringify({ ok: false, message: "PINTEREST_APP_ID not configured." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!redirectUri) {
      return new Response(
        JSON.stringify({ ok: false, message: "PINTEREST_REDIRECT_URI not configured." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate a random state for CSRF protection
    const stateBytes = new Uint8Array(32);
    crypto.getRandomValues(stateBytes);
    const state = Array.from(stateBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Store state in DB for validation during callback
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { error: insertErr } = await supabase
      .from("oauth_states")
      .insert({ state });

    if (insertErr) {
      console.error("[pinterest-oauth-start] Failed to store state:", insertErr);
      return new Response(
        JSON.stringify({ ok: false, message: "Failed to initialize OAuth flow." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build Pinterest OAuth URL
    const scope = "boards:read,pins:read,pins:write,boards:write";
    const authUrl = new URL("https://www.pinterest.com/oauth/");
    authUrl.searchParams.set("client_id", appId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", scope);
    authUrl.searchParams.set("state", state);

    console.log("[pinterest-oauth-start] Auth URL generated for app:", appId);

    return new Response(
      JSON.stringify({ ok: true, auth_url: authUrl.toString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[pinterest-oauth-start] Unhandled error:", err);
    return new Response(
      JSON.stringify({ ok: false, message: "Internal server error." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
