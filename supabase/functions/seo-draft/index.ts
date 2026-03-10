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

CRITICAL FORMATTING RULES — NEVER VIOLATE:
1. Do NOT start the article with the title. The title is stored separately and rendered by the frontend.
2. Do NOT include a cover image or any image tag as the very first element of the body.
3. Start the article body DIRECTLY with the first paragraph of introductory text.
4. You may use images within the body to illustrate points, but NEVER as the very first element.

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

    const { article_id, cta_url } = await req.json();
    if (!article_id) {
      return new Response(JSON.stringify({ error: "article_id is required" }), { status: 400, headers: corsHeaders });
    }

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

EXIGENCES DE LONGUEUR ABSOLUES (non négociables) :
- L'article DOIT faire minimum 1500 mots dans le champ word_count
- Chaque section H2 DOIT contenir minimum 200 mots de contenu
- La section deliverable (tableau, checklist ou plan) DOIT être présente et faire au minimum 300 mots avec des données concrètes
- Les réponses FAQ DOIVENT faire minimum 3 phrases chacune
- Si une section semble courte, développe avec des exemples concrets, des chiffres, des variantes de recettes, des conseils pratiques

STRUCTURE OBLIGATOIRE à respecter dans content_html :
1. Introduction avec hook (150-200 mots)
2. Au moins 5 sections H2 avec contenu développé (200+ mots chacune)
3. Au moins 1 tableau HTML complet avec 3+ colonnes et 5+ lignes
4. La section 'En pratique' ou 'Notre sélection' avec un deliverable concret
5. Section FAQ avec 5 questions/réponses développées
6. Conclusion avec résumé et CTA final

Ne génère PAS un article court. Prends le temps de développer chaque point avec des exemples réels, des variantes, des conseils.

Return only the JSON object.
`;

    const draft = await callOpenAI(DRAFT_SYSTEM_PROMPT, userPrompt, 0.7, 8000);

    // Replace CTA placeholders with actual HTML blocks
    let finalHtml = draft.content_html || "";
    const ctaBlocks = (draft.cta_blocks as any[]) || [];
    const ctaMap: Record<string, any> = {};
    for (const block of ctaBlocks) {
      if (block.position) ctaMap[block.position] = block;
    }

    for (const pos of ["top", "middle", "bottom"]) {
      const placeholder = `{{CTA_${pos.toUpperCase()}}}`;
      const block = ctaMap[pos];
      if (block) {
        const ctaHtml = `<div class="cta-block cta-${pos}" style="background: linear-gradient(135deg, #f0fdf4, #dcfce7); border: 1px solid #86efac; border-radius: 12px; padding: 24px; margin: 32px 0; text-align: center;">
  <h3 style="color: #166534; margin: 0 0 8px 0; font-size: 18px;">${block.headline || ""}</h3>
  <p style="color: #15803d; margin: 0 0 16px 0; font-size: 14px;">${block.body || ""}</p>
  <a href="${ctaUrl}" style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">${block.cta_text || "Découvrir NutriZen"}</a>
</div>`;
        finalHtml = finalHtml.replaceAll(placeholder, ctaHtml);
      } else {
        finalHtml = finalHtml.replaceAll(placeholder, "");
      }
    }
    finalHtml = finalHtml.replaceAll("{{NUTRIZEN_CTA_URL}}", ctaUrl);

    await adminClient.from("seo_articles").update({
      draft_html: finalHtml,
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
    const msg = err instanceof Error ? err.message : "Unknown error";
    const status = (err as any)?.status || (msg === "Admin access required" ? 403 : 500);
    return new Response(JSON.stringify({ error: msg }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
