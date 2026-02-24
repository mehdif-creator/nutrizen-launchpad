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

    const appId = Deno.env.get("PINTEREST_APP_ID");
    const redirectUri = Deno.env.get("PINTEREST_REDIRECT_URI");

    if (!appId) {
      return new Response(
        JSON.stringify({ ok: false, message: "PINTEREST_APP_ID not configured." }),
        { status: 500, headers }
      );
    }

    if (!redirectUri) {
      return new Response(
        JSON.stringify({ ok: false, message: "PINTEREST_REDIRECT_URI not configured." }),
        { status: 500, headers }
      );
    }

    // Generate a random state for CSRF protection
    const stateBytes = new Uint8Array(32);
    crypto.getRandomValues(stateBytes);
    const state = Array.from(stateBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Store state in DB for validation during callback, bound to user
    const { error: insertErr } = await supabase
      .from("oauth_states")
      .insert({ state, user_id: user.id });

    if (insertErr) {
      console.error("[pinterest-oauth-start] Failed to store state:", insertErr);
      return new Response(
        JSON.stringify({ ok: false, message: "Failed to initialize OAuth flow." }),
        { status: 500, headers }
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

    console.log("[pinterest-oauth-start] Auth URL generated for admin user:", user.id);

    return new Response(
      JSON.stringify({ ok: true, auth_url: authUrl.toString() }),
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
    console.error("[pinterest-oauth-start] Unhandled error:", err);
    return new Response(
      JSON.stringify({ ok: false, message: "Internal server error." }),
      { status: 500, headers }
    );
  }
});
