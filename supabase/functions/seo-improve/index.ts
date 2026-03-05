import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/security.ts";
import { requireAdmin } from "../_shared/auth.ts";

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

const IMPROVE_SYSTEM_PROMPT = `
You are a French SEO editor performing targeted improvements on a blog article for NutriZen.

YOUR MISSION: Apply a precise list of fixes to an existing article HTML. Do NOT rewrite the entire article. Only modify the specific sections identified in the fix instructions. Preserve everything not mentioned in required_fixes.

PRINCIPLES: Fix only what is listed. Maintain tone and style. Never introduce medical claims. Preserve all placeholders ({{IMAGE_N_URL}}, {{CTA_*}}).

STRICT RULES: Output ONLY valid JSON. ALL text in French (fr-FR). Return COMPLETE improved article HTML.

OUTPUT SCHEMA:
{
  "content_html": "string (complete improved HTML)",
  "word_count": "number",
  "changes_made": ["string"],
  "quality_flags": { "needs_sources": "boolean", "medical_risk": "boolean", "thin_content": "boolean" }
}
`;

const MAX_IMPROVE_ATTEMPTS = 3;

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

    if (article.status !== "qa_done") {
      return new Response(JSON.stringify({ error: `Invalid status: ${article.status}. Expected qa_done.` }), { status: 400, headers: corsHeaders });
    }

    if (article.qa_pass) {
      return new Response(JSON.stringify({ article_id, message: "QA already passed. No improvement needed." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if ((article.improve_attempts || 0) >= MAX_IMPROVE_ATTEMPTS) {
      return new Response(JSON.stringify({ error: `Max improvement attempts (${MAX_IMPROVE_ATTEMPTS}) reached. Manual review required.` }), {
        status: 400, headers: corsHeaders,
      });
    }

    const qaResult = article.qa_result as any;
    const requiredFixes = qaResult?.required_fixes || [];

    if (requiredFixes.length === 0) {
      return new Response(JSON.stringify({ article_id, message: "No fixes required." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userPrompt = `
Improve this French blog article by applying the required fixes listed below.

REQUIRED FIXES:
${requiredFixes.map((fix: string, i: number) => `${i + 1}. ${fix}`).join('\n')}

CONTENT BRIEF:
${JSON.stringify(article.brief, null, 2)}

CTA BLOCKS TO USE:
${JSON.stringify(article.cta_blocks, null, 2)}

ORIGINAL ARTICLE HTML:
${article.draft_html}

Apply only the listed fixes. Return the complete improved article as JSON.
`;

    const improved = await callOpenAI(IMPROVE_SYSTEM_PROMPT, userPrompt, 0.5, 4000);

    await adminClient.from("seo_articles").update({
      draft_html: improved.content_html,
      quality_flags: improved.quality_flags,
      improve_attempts: (article.improve_attempts || 0) + 1,
      status: "draft_done",
      error_message: null,
    }).eq("id", article_id);

    return new Response(JSON.stringify({
      article_id,
      attempt: (article.improve_attempts || 0) + 1,
      changes_made: improved.changes_made,
      word_count: improved.word_count,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("[seo-improve] Error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    const status = (err as any)?.status || (msg === "Admin access required" ? 403 : 500);
    return new Response(JSON.stringify({ error: msg }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
