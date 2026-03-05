import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const { keyword, cluster_context, article_id } = await req.json();
    if (!keyword) {
      return new Response(JSON.stringify({ error: "keyword is required" }), { status: 400, headers: corsHeaders });
    }

    const SERPAPI_KEY = Deno.env.get("SERPAPI_KEY");
    if (!SERPAPI_KEY) {
      return new Response(JSON.stringify({ error: "SERPAPI_KEY not configured" }), { status: 500, headers: corsHeaders });
    }

    // Google France search
    const serpUrl = new URL("https://serpapi.com/search.json");
    serpUrl.searchParams.set("q", keyword);
    serpUrl.searchParams.set("gl", "fr");
    serpUrl.searchParams.set("hl", "fr");
    serpUrl.searchParams.set("google_domain", "google.fr");
    serpUrl.searchParams.set("num", "10");
    serpUrl.searchParams.set("api_key", SERPAPI_KEY);

    const serpRes = await fetch(serpUrl.toString());
    if (!serpRes.ok) {
      const errText = await serpRes.text();
      console.error("[seo-serp-research] SerpAPI error:", serpRes.status, errText);
      return new Response(JSON.stringify({ error: "SerpAPI request failed", details: errText }), { status: 502, headers: corsHeaders });
    }

    const serpData = await serpRes.json();

    // Extract organic results snapshot
    const organicResults = (serpData.organic_results || []).slice(0, 10).map((r: any) => ({
      position: r.position,
      title: r.title,
      link: r.link,
      snippet: r.snippet,
      displayed_link: r.displayed_link,
    }));

    // Extract PAA questions
    const paaQuestions = (serpData.related_questions || []).map((q: any) => q.question).filter(Boolean);

    // Extract related searches
    const relatedKeywords = (serpData.related_searches || []).map((s: any) => s.query).filter(Boolean);

    const serpSnapshot = JSON.stringify(organicResults, null, 2);

    // Create or update seo_articles row
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let rowId = article_id;
    if (!rowId) {
      const { data: inserted, error: insertErr } = await adminClient
        .from("seo_articles")
        .insert({
          keyword,
          cluster_context: cluster_context || null,
          status: "serp_done",
          serp_snapshot: organicResults,
          paa_questions: paaQuestions,
          related_keywords: relatedKeywords,
          created_by: claims.claims.sub,
        })
        .select("id")
        .single();

      if (insertErr) {
        console.error("[seo-serp-research] Insert error:", insertErr);
        return new Response(JSON.stringify({ error: "DB insert failed", details: insertErr.message }), { status: 500, headers: corsHeaders });
      }
      rowId = inserted.id;
    } else {
      const { error: updateErr } = await adminClient
        .from("seo_articles")
        .update({
          status: "serp_done",
          serp_snapshot: organicResults,
          paa_questions: paaQuestions,
          related_keywords: relatedKeywords,
          error_message: null,
        })
        .eq("id", rowId);

      if (updateErr) {
        console.error("[seo-serp-research] Update error:", updateErr);
      }
    }

    return new Response(JSON.stringify({
      article_id: rowId,
      serp_snapshot: serpSnapshot,
      paa_questions: paaQuestions,
      related_keywords: relatedKeywords,
      organic_count: organicResults.length,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    console.error("[seo-serp-research] Error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
