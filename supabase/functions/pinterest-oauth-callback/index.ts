import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, getSecurityHeaders } from '../_shared/security.ts';
import { requireAdmin } from '../_shared/auth.ts';

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const headers = { ...corsHeaders, ...getSecurityHeaders(), "Content-Type": "application/json" };

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify JWT and require admin role
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ ok: false, message: "Authentication required." }),
        { status: 401, headers }
      );
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ ok: false, message: "Invalid or expired token." }),
        { status: 401, headers }
      );
    }

    await requireAdmin(supabase, user.id);

    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (!code || !state) {
      return new Response(
        JSON.stringify({ ok: false, message: "Missing code or state parameter." }),
        { status: 400, headers }
      );
    }

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
        { status: 400, headers }
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
        { status: 500, headers }
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
        { status: 400, headers }
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
        JSON.stringify({ ok: false, message: "Failed to store tokens." }),
        { status: 500, headers }
      );
    }

    console.log("[pinterest-oauth-callback] Token stored successfully for admin:", user.id);

    return new Response(
      JSON.stringify({ ok: true }),
      { headers }
    );
  } catch (err) {
    if (err && typeof err === 'object' && 'statusCode' in err) {
      const secErr = err as { statusCode: number; message: string };
      return new Response(
        JSON.stringify({ ok: false, message: secErr.message }),
        { status: secErr.statusCode, headers }
      );
    }
    console.error("[pinterest-oauth-callback] Unhandled error:", err);
    return new Response(
      JSON.stringify({ ok: false, message: "Internal server error." }),
      { status: 500, headers }
    );
  }
});
