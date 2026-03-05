import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getAdminClient() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

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

const DRAFT_SYSTEM_PROMPT = `
You are an expert French SEO content writer and nutritionist communicator.
You write long-form blog articles for NutriZen, a French nutrition planning app.

YOUR READER: French adults (25-55) looking for practical, reliable nutrition guidance.

FRENCH WRITING STYLE:
- Tone: warm, expert, non-judgmental ("vous" form)
- Paragraphs: max 4 sentences. Short + medium sentences.
- Never use hype words or medical claims.
- French punctuation: space before ":", "?", "!", ";"

Use {{CTA_TOP}}, {{CTA_MIDDLE}}, {{CTA_BOTTOM}} as CTA placeholders.
Use {{IMAGE_1_URL}}, {{IMAGE_2_URL}} etc. as image placeholders.
Include FAQ section with <details><summary> elements.
End with disclaimer.

STRICT RULES: Output ONLY valid JSON. ALL text in French (fr-FR). content_html must be valid HTML.

OUTPUT SCHEMA:
{
  "content_html": "string (complete HTML article)",
  "word_count": "number",
  "faq": [{ "q": "string", "a": "string" }],
  "cta_blocks": [{ "position": "top|middle|bottom", "headline": "string", "body": "string", "cta_text": "string", "cta_url": "{{NUTRIZEN_CTA_URL}}" }],
  "schema_json": "object (schema.org JSON-LD)",
  "disclaimer_text": "string",
  "quality_flags": { "needs_sources": "boolean", "medical_risk": "boolean", "thin_content": "boolean" }
}
`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const { article_id, cta_url } = await req.json();
    if (!article_id) {
      return new Response(JSON.stringify({ error: "article_id is required" }), { status: 400, headers: corsHeaders });
    }

    const adminClient = getAdminClient();
    const { data: article, error } = await adminClient.from("seo_articles").select("*").eq("id", article_id).single();
    if (error) throw new Error(`Article not found: ${error.message}`);

    if (article.status !== "images_done") {
      return new Response(JSON.stringify({ error: `Invalid status: ${article.status}. Expected images_done.` }), { status: 400, headers: corsHeaders });
    }

    const imageUrls = (article.image_urls as any[]) || [];
    const ctaUrl = cta_url || "https://mynutrizen.fr/auth/signup";

    const userPrompt = `
Write the complete French blog article based on this outline and brief.

ARTICLE OUTLINE:
${JSON.stringify(article.outline, null, 2)}

CONTENT BRIEF:
${JSON.stringify(article.brief, null, 2)}

AVAILABLE IMAGES:
${imageUrls.map((img: any, i: number) => `Image ${i + 1}: ${img.url} | Alt: ${img.alt}`).join('\n')}

NUTRIZEN CTA URL: ${ctaUrl}

Write the complete article now. All content in French.
Minimum ${(article.outline as any)?.estimated_word_count || 1500} words.
Return only the JSON object.
`;

    const draft = await callOpenAI(DRAFT_SYSTEM_PROMPT, userPrompt, 0.6, 4000);

    await adminClient.from("seo_articles").update({
      draft_html: draft.content_html,
      draft_meta: {
        word_count: draft.word_count,
        faq: draft.faq,
        disclaimer_text: draft.disclaimer_text,
      },
      cta_blocks: draft.cta_blocks,
      schema_json: draft.schema_json,
      quality_flags: draft.quality_flags,
      status: "draft_done",
      error_message: null,
    }).eq("id", article_id);

    return new Response(JSON.stringify({ article_id, word_count: draft.word_count, quality_flags: draft.quality_flags }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("[seo-draft] Error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
