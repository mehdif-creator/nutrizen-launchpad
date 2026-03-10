import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/security.ts";
import { requireAdmin } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const token = authHeader.replace("Bearer ", "");
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: { user }, error: authError } = await adminClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: corsHeaders });
    }
    await requireAdmin(adminClient, user.id);

    const { data: articles, error } = await adminClient
      .from("seo_articles")
      .select("id, keyword, draft_html, image_urls, outline")
      .eq("status", "published");

    if (error) throw new Error(error.message);

    let fixed = 0;
    for (const art of articles || []) {
      let html = art.draft_html || "";
      const original = html;
      const title = (art.outline as any)?.h1 || art.keyword || "";

      // Strip leading <h1> or <h2> matching title
      if (title) {
        const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        html = html.replace(new RegExp(`^\\s*<(h[12])[^>]*>\\s*${escaped}\\s*<\\/\\1>\\s*`, 'i'), '');
      }

      // Strip leading <figure><img>...</figure> or standalone <img>
      html = html.replace(/^\s*<figure[^>]*>\s*<img[^>]*\/?>\s*(?:<figcaption[^>]*>.*?<\/figcaption>\s*)?<\/figure>\s*/is, '');
      html = html.replace(/^\s*<p>\s*<img[^>]*\/?>\s*<\/p>\s*/i, '');
      html = html.replace(/^\s*<img[^>]*\/?>\s*/i, '');

      if (html !== original) {
        await adminClient.from("seo_articles").update({ draft_html: html }).eq("id", art.id);
        fixed++;
        console.log(`[cleanup] Fixed article ${art.id} (${art.keyword})`);
      }
    }

    return new Response(JSON.stringify({ total: articles?.length || 0, fixed }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
