import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

const KEYWORD_EXPAND_SYSTEM_PROMPT = `
You are an SEO keyword researcher specializing in the French nutrition and wellness market (France, google.fr).

Given a seed keyword, generate high-value long-tail keyword variations that:
1. Have clear search intent
2. Are likely searched by French users on Google France
3. Align with NutriZen's product (meal planning, calorie tracking, balanced diet)

KEYWORD QUALITY: Prefer 3-5 word phrases. Include question-based, comparison, and template keywords.
FUNNEL: tofu (informational), mofu (solution-aware), bofu (ready to act).

STRICT RULES: Output ONLY valid JSON. ALL keywords in French, lowercase. 15-30 keywords.

OUTPUT SCHEMA:
{
  "seed_keyword": "string",
  "expanded_keywords": [{
    "keyword": "string (lowercase French)",
    "intent": "informational | commercial | transactional",
    "funnel_stage": "tofu | mofu | bofu",
    "serp_format": "guide | list | howto | menu_template | comparison",
    "estimated_priority": "number (1-100)",
    "rationale": "string (in French)"
  }]
}
`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const { seed_keyword, cluster_context, existing_keywords } = await req.json();
    if (!seed_keyword) {
      return new Response(JSON.stringify({ error: "seed_keyword is required" }), { status: 400, headers: corsHeaders });
    }

    const userPrompt = `
Expand this seed keyword for the NutriZen French nutrition blog.

SEED KEYWORD: "${seed_keyword}"
CLUSTER CONTEXT: ${cluster_context || "N/A"}

ALREADY HAVE THESE KEYWORDS (do not duplicate):
${(existing_keywords || []).join(', ')}

Generate 15-25 high-value long-tail keyword variations.
All keywords in French. Return only the JSON object.
`;

    const result = await callOpenAI(KEYWORD_EXPAND_SYSTEM_PROMPT, userPrompt, 0.4, 2000);

    return new Response(JSON.stringify(result), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("[seo-keyword-expand] Error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
