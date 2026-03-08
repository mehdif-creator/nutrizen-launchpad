import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/security.ts";
import { requireAdmin } from "../_shared/auth.ts";

const FALLBACK_PROMPT = "Healthy balanced meal, fresh colorful vegetables and ingredients on a clean white kitchen counter, soft natural lighting, French lifestyle photography, no text, no watermark, high resolution";

function getAdminClient() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

function isTemporaryUrl(url: string): boolean {
  return url.includes("oaidalleapiprodscus.blob.core.windows.net") || url.includes("oaidalla");
}

async function regenerateAndStore(
  adminClient: ReturnType<typeof getAdminClient>,
  prompt: string,
  articleId: string,
  index: number,
  size: string
): Promise<string> {
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;

  // Generate new image
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt,
      n: 1,
      size,
      quality: "hd",
      style: "natural",
      response_format: "url",
    }),
  });
  if (!res.ok) throw new Error(`DALL-E error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const dalleUrl = data.data?.[0]?.url;
  if (!dalleUrl) throw new Error("No URL returned from DALL-E");

  // Download immediately
  const imgResponse = await fetch(dalleUrl);
  if (!imgResponse.ok) throw new Error(`Failed to download image: ${imgResponse.status}`);
  const imgBuffer = await imgResponse.arrayBuffer();

  // Upload to Supabase Storage
  const fileName = `article-${articleId}-image-${index}-${Date.now()}.jpg`;
  const { error: uploadError } = await adminClient.storage
    .from("seo-images")
    .upload(fileName, imgBuffer, {
      contentType: "image/jpeg",
      upsert: true,
      cacheControl: "31536000",
    });

  if (uploadError) {
    console.error("[seo-image-refresh] Storage upload failed:", uploadError);
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

  const { data: { publicUrl } } = adminClient.storage
    .from("seo-images")
    .getPublicUrl(fileName);

  return publicUrl;
}

async function refreshArticle(
  adminClient: ReturnType<typeof getAdminClient>,
  article: any
): Promise<boolean> {
  const imageUrls = Array.isArray(article.image_urls) ? article.image_urls : [];
  if (imageUrls.length === 0) return false;

  let changed = false;
  const updated = [...imageUrls];
  const outline = article.outline as any;

  for (let i = 0; i < updated.length; i++) {
    const img = updated[i];
    if (!img?.url || !isTemporaryUrl(img.url)) continue;

    // Determine prompt
    let prompt = FALLBACK_PROMPT;
    if (img.type === "hero" && outline?.hero_image_prompt) {
      prompt = outline.hero_image_prompt;
    } else if (img.type === "section" && outline?.sections) {
      const section = outline.sections.find((s: any) => s.image_alt === img.alt || s.h2 === img.alt);
      if (section?.image_prompt) prompt = section.image_prompt;
    }

    const size = img.type === "hero" ? "1792x1024" : "1024x1024";

    try {
      console.log(`[seo-image-refresh] Regenerating image ${i} for article ${article.id}`);
      const permanentUrl = await regenerateAndStore(adminClient, prompt, article.id, i, size);
      updated[i] = { ...img, url: permanentUrl };
      changed = true;
    } catch (err) {
      console.error(`[seo-image-refresh] Failed for article ${article.id} image ${i}:`, err);
    }
  }

  if (changed) {
    await adminClient.from("seo_articles").update({ image_urls: updated }).eq("id", article.id);
  }

  return changed;
}

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
    const adminClient = getAdminClient();
    const { data: { user }, error: authError } = await adminClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: corsHeaders });
    }
    await requireAdmin(adminClient, user.id);

    if (!Deno.env.get("OPENAI_API_KEY")) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY not configured" }), { status: 500, headers: corsHeaders });
    }

    const body = await req.json();
    let refreshedCount = 0;

    if (body.article_id) {
      // Single article
      const { data: article, error } = await adminClient.from("seo_articles").select("*").eq("id", body.article_id).single();
      if (error) throw new Error(`Article not found: ${error.message}`);
      const didRefresh = await refreshArticle(adminClient, article);
      if (didRefresh) refreshedCount = 1;
    } else if (body.refresh_all) {
      // All published articles with image_urls
      const { data: articles, error } = await adminClient
        .from("seo_articles")
        .select("*")
        .not("image_urls", "is", null)
        .eq("status", "published");
      if (error) throw new Error(`Query error: ${error.message}`);

      for (const article of articles || []) {
        const didRefresh = await refreshArticle(adminClient, article);
        if (didRefresh) refreshedCount++;
      }
    } else {
      return new Response(JSON.stringify({ error: "Provide article_id or refresh_all: true" }), { status: 400, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ success: true, refreshed_count: refreshedCount }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[seo-image-refresh] Error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    const status = (err as any)?.status || (msg === "Admin access required" ? 403 : 500);
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
