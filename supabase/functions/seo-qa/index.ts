import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getAdminClient() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), { status: 500, headers: corsHeaders });
    }

    const { article_id } = await req.json();
    if (!article_id) {
      return new Response(JSON.stringify({ error: "article_id is required" }), { status: 400, headers: corsHeaders });
    }

    const adminClient = getAdminClient();
    const { data: article, error } = await adminClient.from("seo_articles").select("*").eq("id", article_id).single();
    if (error) throw new Error(`Article not found: ${error.message}`);

    if (article.status !== "draft_done") {
      return new Response(JSON.stringify({ error: `Invalid status: ${article.status}. Expected draft_done.` }), { status: 400, headers: corsHeaders });
    }

    // Get competitor snippets from SERP data
    const competitorSnippets = ((article.serp_snapshot as any[]) || [])
      .slice(0, 3)
      .map((r: any) => `Title: ${r.title}\nSnippet: ${r.snippet}\nURL: ${r.link}`);

    const qualityFlags = (article.quality_flags as any) || {};
    const draftMeta = (article.draft_meta as any) || {};

    const QA_SYSTEM_PROMPT = `
You are a senior SEO editor and conversion specialist reviewing French blog articles for NutriZen.

SCORING SYSTEM (100 points total):
[KEYWORD OPTIMIZATION — 20 pts] Primary keyword in meta_title, H1, first paragraph, H2s, secondary keywords distributed.
[CONTENT DEPTH — 20 pts] Word count ≥ 1200, deliverable section, FAQ with 5+ answers, concrete data/examples.
[USER INTENT MATCH — 20 pts] Directly answers searcher's question, format matches expected, covers full journey.
[READABILITY — 20 pts] Short intro hook, paragraphs ≤ 4 sentences, smooth transitions, mixed content formats.
[CONVERSION POTENTIAL — 20 pts] 3 CTAs present, contextually relevant, NutriZen value demonstrated.

MEDICAL RISK: Flag if article contains treatment claims, unsafe caloric restrictions, guaranteed results.
DUPLICATE RISK: Score 0.0-1.0 based on content originality.

If seo_score < 60, pass_fail = "fail". If medical_risk = true, pass_fail = "fail".

STRICT RULES: Output ONLY valid JSON. ALL text values in French (fr-FR).

OUTPUT SCHEMA:
{
  "pass_fail": "pass | fail",
  "seo_score": "number (0-100)",
  "scores": { "keyword_optimization": "number", "content_depth": "number", "user_intent_match": "number", "readability": "number", "conversion_potential": "number" },
  "duplicate_risk_score": "number (0.0-1.0)",
  "medical_risk": "boolean",
  "issues": [{ "severity": "critical|warning|info", "category": "string", "section": "string", "problem": "string", "fix": "string" }],
  "strengths": ["string"],
  "required_fixes": ["string"]
}
`;

    const userPrompt = `
Review this French blog article for NutriZen. Apply all scoring criteria strictly.

CONTENT BRIEF:
${JSON.stringify(article.brief, null, 2)}

ARTICLE OUTLINE:
${JSON.stringify(article.outline, null, 2)}

QUALITY FLAGS: needs_sources: ${qualityFlags.needs_sources}, medical_risk: ${qualityFlags.medical_risk}, thin_content: ${qualityFlags.thin_content}
word_count: ${draftMeta.word_count || 0}

TOP 3 COMPETITOR SNIPPETS:
${competitorSnippets.join('\n\n')}

ARTICLE HTML TO REVIEW:
${article.draft_html}

Apply the scoring rubric strictly. Output only the QA JSON object.
`;

    // Call Claude API
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        temperature: 0.2,
        messages: [
          { role: "user", content: `${QA_SYSTEM_PROMPT}\n\n${userPrompt}` },
        ],
      }),
    });

    if (!claudeRes.ok) {
      const errText = await claudeRes.text();
      console.error("[seo-qa] Claude API error:", claudeRes.status, errText);
      throw new Error(`Claude API error ${claudeRes.status}: ${errText}`);
    }

    const claudeData = await claudeRes.json();
    const qaText = claudeData.content?.[0]?.text || "{}";
    
    // Extract JSON from response (Claude may wrap in markdown)
    let qaResult: any;
    try {
      const jsonMatch = qaText.match(/\{[\s\S]*\}/);
      qaResult = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(qaText);
    } catch {
      console.error("[seo-qa] Failed to parse Claude response:", qaText.slice(0, 500));
      throw new Error("Failed to parse QA response from Claude");
    }

    await adminClient.from("seo_articles").update({
      qa_result: qaResult,
      qa_score: qaResult.seo_score || 0,
      qa_pass: qaResult.pass_fail === "pass",
      status: "qa_done",
      error_message: null,
    }).eq("id", article_id);

    return new Response(JSON.stringify({
      article_id,
      pass_fail: qaResult.pass_fail,
      seo_score: qaResult.seo_score,
      scores: qaResult.scores,
      issues_count: qaResult.issues?.length || 0,
      required_fixes_count: qaResult.required_fixes?.length || 0,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("[seo-qa] Error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
