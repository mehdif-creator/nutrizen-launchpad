import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/security.ts";
import { requireAdmin } from "../_shared/auth.ts";

async function callOpenAI(systemPrompt: string, userPrompt: string, temperature: number, maxTokens: number) {
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
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
    throw new Error(`OpenAI API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return JSON.parse(data.choices?.[0]?.message?.content || "{}");
}

function getAdminClient() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

const OUTLINE_SYSTEM_PROMPT = `
You are a senior French SEO editor and information architect. You transform content briefs into precise article outlines optimized for Google France ranking and user engagement.

YOUR MISSION: Create a detailed article outline that follows the serp_format_expected from the brief, places the primary keyword strategically, structures content to match the user's search journey, includes NutriZen CTAs, and plans visuals.

SEO TITLE RULES:
- meta_title: max 60 characters, primary keyword in first 3 words
- meta_description: max 155 characters
- h1: different from title, more conversational
- slug: lowercase kebab-case, max 6 words, no accents

SECTION STRUCTURE: 4 to 7 H2 sections, each 250-400 words, FAQ: 5-8 questions.
image_prompt values in English for DALL-E. All text values in French.

STRICT RULES: Output ONLY valid JSON. ALL text values in French. Slugs lowercase kebab-case no accents.

OUTPUT SCHEMA (strict JSON):
{
  "title": "string", "h1": "string", "meta_title": "string (max 60 chars)",
  "meta_description": "string (max 155 chars)", "excerpt": "string (max 150 chars)",
  "slug": "string", "estimated_word_count": "number", "reading_time_minutes": "number",
  "hero_image_prompt": "string (ENGLISH)", "hero_image_alt": "string (FRENCH)",
  "schema_type": "Article | HowTo | FAQPage",
  "sections": [{ "h2": "string", "purpose": "string", "h3s": ["string"],
    "has_table": "boolean", "has_list": "boolean",
    "image_prompt": "string | null (ENGLISH)", "image_alt": "string | null (FRENCH)",
    "cta_placement": "boolean" }],
  "faq": [{ "q": "string" }]
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

    const { data: article, error } = await adminClient.from("seo_articles").select("*").eq("id", article_id).single();
    if (error) throw new Error(`Article not found: ${error.message}`);

    if (article.status !== "brief_done") {
      return new Response(JSON.stringify({ error: `Invalid status: ${article.status}. Expected brief_done.` }), { status: 400, headers: corsHeaders });
    }

    const userPrompt = `
Using this content brief, create the complete article outline JSON.

CONTENT BRIEF:
${JSON.stringify(article.brief, null, 2)}

Remember: All text values in French. image_prompt values in English. slug no accents. meta_title ≤ 60 chars, meta_description ≤ 155 chars.
Produce the outline JSON now.
`;

    const outline = await callOpenAI(OUTLINE_SYSTEM_PROMPT, userPrompt, 0.4, 2000);

    await adminClient.from("seo_articles").update({
      outline,
      status: "outline_done",
      error_message: null,
    }).eq("id", article_id);

    return new Response(JSON.stringify({ article_id, outline }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("[seo-outline] Error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    const status = (err as any)?.status || (msg === "Admin access required" ? 403 : 500);
    return new Response(JSON.stringify({ error: msg }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
