import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/security.ts";
import { requireAdmin } from "../_shared/auth.ts";

async function callOpenAI(systemPrompt: string, userPrompt: string, temperature: number, maxTokens: number) {
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      temperature,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("[callOpenAI] Error:", res.status, errText);
    throw new Error(`OpenAI API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty response from OpenAI");
  return JSON.parse(content);
}

async function getArticle(adminClient: any, articleId: string) {
  const { data, error } = await adminClient
    .from("seo_articles")
    .select("*")
    .eq("id", articleId)
    .single();
  if (error) throw new Error(`Article not found: ${error.message}`);
  return data;
}

async function updateArticle(adminClient: any, articleId: string, updates: any) {
  const { error } = await adminClient
    .from("seo_articles")
    .update(updates)
    .eq("id", articleId);
  if (error) throw new Error(`Update failed: ${error.message}`);
}

function getAdminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

const BRIEF_SYSTEM_PROMPT = `
You are a senior SEO strategist and content director specializing in the French nutrition and wellness market. You work for NutriZen, a French nutrition app that helps users plan meals, track calories, and achieve their health goals.

YOUR MISSION:
Analyze SERP data for a given keyword and produce a precise, actionable content brief that will guide the creation of a French blog article designed to:
1. Rank on Google France (google.fr)
2. Genuinely help the target reader solve their problem
3. Naturally convert readers into NutriZen app users

STRICT RULES:
- Output ONLY valid JSON matching the exact schema provided. No markdown, no explanation.
- ALL text values in the JSON must be written in French (fr-FR).
- Never suggest medical claims, diagnostic statements, or therapeutic promises.
- The content angle must be DIFFERENTIATED from competitors found in the SERP.

FRENCH MARKET CONTEXT:
- Tone: warm, practical, non-judgmental, encouraging
- Avoid: "régime draconien", "perdre du poids rapidement", miracle claims
- Prefer: "équilibre alimentaire", "habitudes durables", "progresser à son rythme"

OUTPUT SCHEMA (strict JSON, all text values in French):
{
  "primary_keyword": "string",
  "secondary_keywords": ["string"],
  "intent": "informational | commercial | transactional",
  "funnel_stage": "tofu | mofu | bofu",
  "serp_format_expected": "guide | list | howto | menu_template | comparison",
  "target_reader": "string",
  "pain_points": ["string"],
  "content_angle": "string",
  "hook_type": "stat | question | story | contrarian",
  "hook_suggestion": "string",
  "faq_questions": ["string"],
  "must_include_sections": ["string"],
  "deliverable_type": "string",
  "cta_strategy": { "tofu_cta": "string", "mofu_cta": "string", "bofu_cta": "string" },
  "image_directions": ["string"],
  "must_avoid": ["string"],
  "estimated_difficulty": "easy | medium | hard",
  "word_count_target": "number"
}
`;

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // --- JWT validation + admin role check ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const token = authHeader.replace("Bearer ", "");
    const adminClient = getAdminClient();
    const { data: { user }, error: authError } = await adminClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid or expired token" }), { status: 401, headers: corsHeaders });
    }
    await requireAdmin(adminClient, user.id);
    // --- end auth ---

    const { article_id } = await req.json();
    if (!article_id) {
      return new Response(JSON.stringify({ error: "article_id is required" }), { status: 400, headers: corsHeaders });
    }

    const article = await getArticle(adminClient, article_id);

    if (article.status !== "serp_done") {
      return new Response(JSON.stringify({ error: `Invalid status: ${article.status}. Expected serp_done.` }), { status: 400, headers: corsHeaders });
    }

    const userPrompt = `
Analyze the following SERP data and produce the content brief JSON.

TARGET KEYWORD: "${article.keyword}"
CLUSTER CONTEXT: ${article.cluster_context || "N/A"}

TOP SERP RESULTS (Google France):
${JSON.stringify(article.serp_snapshot, null, 2)}

PEOPLE ALSO ASK:
${(article.paa_questions || []).map((q: string, i: number) => `${i + 1}. ${q}`).join('\n')}

RELATED SEARCHES:
${(article.related_keywords || []).join(', ')}

Produce the brief JSON now. All text values in French.
`;

    const brief = await callOpenAI(BRIEF_SYSTEM_PROMPT, userPrompt, 0.3, 1500);

    await updateArticle(adminClient, article_id, {
      brief,
      status: "brief_done",
      error_message: null,
    });

    return new Response(JSON.stringify({ article_id, brief }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("[seo-brief] Error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    const status = (err as any)?.status || (msg === "Admin access required" ? 403 : 500);
    return new Response(JSON.stringify({ error: msg }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
