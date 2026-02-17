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
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (!code || !state) {
      return new Response(
        JSON.stringify({ ok: false, message: "Missing code or state parameter." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Admin Supabase client (service_role)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1) Validate state against oauth_states table
    const { data: stateRow, error: stateErr } = await supabase
      .from("oauth_states")
      .select("state")
      .eq("state", state)
      .maybeSingle();

    if (stateErr || !stateRow) {
      console.error("[pinterest-oauth-callback] Invalid state:", stateErr);
      return new Response(
        JSON.stringify({ ok: false, message: "Invalid or expired OAuth state." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete used state
    await supabase.from("oauth_states").delete().eq("state", state);

    // 2) Exchange code for access token
    const appId = Deno.env.get("PINTEREST_APP_ID");
    const appSecret = Deno.env.get("PINTEREST_APP_SECRET");
    const redirectUri = Deno.env.get("PINTEREST_REDIRECT_URI") || `${url.origin}/oauth/pinterest/callback`;

    if (!appId || !appSecret) {
      console.error("[pinterest-oauth-callback] Missing PINTEREST_APP_ID or PINTEREST_APP_SECRET");
      return new Response(
        JSON.stringify({ ok: false, message: "Pinterest API credentials not configured." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tokenRes = await fetch("https://api.pinterest.com/v5/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${btoa(`${appId}:${appSecret}`)}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("[pinterest-oauth-callback] Token exchange failed:", tokenData);
      return new Response(
        JSON.stringify({
          ok: false,
          message: tokenData.message || "Token exchange failed with Pinterest.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const {
      access_token,
      refresh_token,
      expires_in,
      scope,
    } = tokenData;

    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

    // 3) Upsert tokens into pinterest_oauth table
    const { error: upsertErr } = await supabase
      .from("pinterest_oauth")
      .upsert(
        {
          account_label: "main",
          access_token_enc: access_token,
          refresh_token_enc: refresh_token || null,
          scope: scope || null,
          expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "account_label" }
      );

    if (upsertErr) {
      console.error("[pinterest-oauth-callback] DB upsert error:", upsertErr);
      return new Response(
        JSON.stringify({ ok: false, message: upsertErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[pinterest-oauth-callback] Token stored successfully, expires:", expiresAt);

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[pinterest-oauth-callback] Unhandled error:", err);
    return new Response(
      JSON.stringify({ ok: false, message: "Internal server error." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
