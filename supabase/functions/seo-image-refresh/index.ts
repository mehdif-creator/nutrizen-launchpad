import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/security.ts";
import { requireAdmin } from "../_shared/auth.ts";

const FALLBACK_PROMPT =
  "Healthy balanced meal on a white ceramic plate with fresh colorful vegetables, soft natural lighting, clean modern kitchen background, French lifestyle photography, no text, no watermark, high quality, appetizing food photography";

const STYLE_SUFFIX =
  "Professional French food lifestyle photography, soft natural lighting, bright airy clean background, soft greens and warm whites palette, natural wood tones, modern French kitchen aesthetic. Absolutely no text, no words, no letters, no captions, no labels, no logos, no watermark. High resolution.";

type ArticleImage = { url?: string; alt?: string; type?: string };

type SeoArticleRow = {
  id: string;
  keyword: string | null;
  status: string | null;
  outline: Record<string, unknown> | null;
  image_urls: unknown;
};

function getAdminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRole) throw new Error("Missing Supabase service credentials");
  return createClient(url, serviceRole);
}

function parseImageUrls(raw: unknown): ArticleImage[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as ArticleImage[];
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as ArticleImage[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function isExpiredUrl(url: string): boolean {
  if (!url) return true;
  if (url.includes("oaidalleapiprodscus.blob.core.windows.net")) return true;
  if (url.includes("oaidalla")) return true;
  if (url.includes("dalle-prod")) return true;
  if (url.includes("openai.com")) return true;
  if (url.startsWith("data:")) return true;

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  if (supabaseUrl && url.includes(`${supabaseUrl}/storage/v1/object/public/seo-images/`)) return false;
  if (url.includes("/storage/v1/object/public/seo-images/")) return false;
  return false;
}

function getPromptForImage(img: ArticleImage, outline: Record<string, any> | null): string {
  let prompt = FALLBACK_PROMPT;
  if (img.type === "hero" && outline?.hero_image_prompt) {
    prompt = String(outline.hero_image_prompt);
  } else if (img.type === "section" && Array.isArray(outline?.sections)) {
    const section = outline.sections.find(
      (s: any) => s?.image_alt === img.alt || s?.h2 === img.alt || Boolean(s?.image_prompt)
    );
    if (section?.image_prompt) prompt = String(section.image_prompt);
  }
  return `${prompt}. ${STYLE_SUFFIX}`;
}

function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; mime: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Invalid data URL");
  const mime = match[1];
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return { bytes, mime };
}

async function generateAndStore(
  adminClient: ReturnType<typeof getAdminClient>,
  prompt: string,
  articleId: string,
  imageIndex: number
): Promise<string | null> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    console.error("[seo-image-refresh] LOVABLE_API_KEY missing");
    return null;
  }

  const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai/gpt-image-2.5-sunburst",
      prompt: prompt.slice(0, 4000),
      size: "1536x1024",
      n: 1,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`[seo-image-refresh] Gateway error ${res.status}:`, errText.slice(0, 300));
    return null;
  }

  const data = await res.json();
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) {
    console.error("[seo-image-refresh] No image returned by gateway");
    return null;
  }
  const dataUrl = `data:image/png;base64,${b64}`;

  const { bytes, mime } = dataUrlToBytes(dataUrl);
  const ext = mime.includes("jpeg") || mime.includes("jpg") ? "jpg" : "png";
  const fileName = `seo-${articleId}-${imageIndex}-${Date.now()}.${ext}`;

  const { error: uploadError } = await adminClient.storage
    .from("seo-images")
    .upload(fileName, bytes, {
      contentType: mime,
      upsert: true,
      cacheControl: "31536000",
    });

  if (uploadError) {
    console.error("[seo-image-refresh] Upload error:", uploadError);
    return null;
  }

  const { data: { publicUrl } } = adminClient.storage.from("seo-images").getPublicUrl(fileName);
  return publicUrl;
}

async function refreshArticle(
  adminClient: ReturnType<typeof getAdminClient>,
  article: SeoArticleRow,
  errors: string[]
): Promise<boolean> {
  const imageUrls = parseImageUrls(article.image_urls);
  if (imageUrls.length === 0) return false;

  const needsRefresh = imageUrls.some((img) => isExpiredUrl(img?.url ?? ""));
  if (!needsRefresh) return false;

  const outline = (article.outline ?? null) as Record<string, any> | null;
  const updated = [...imageUrls];
  let changed = false;

  for (let i = 0; i < updated.length; i++) {
    const img = updated[i];
    const url = img?.url ?? "";
    if (!isExpiredUrl(url)) continue;

    const prompt = getPromptForImage(img, outline);
    try {
      console.log(`[seo-image-refresh] Regenerating article=${article.id}, image=${i}`);
      const permanentUrl = await generateAndStore(adminClient, prompt, article.id, i);
      if (!permanentUrl) {
        errors.push(`Image generation failed for article ${article.id}, image ${i}`);
        continue;
      }
      updated[i] = { ...img, url: permanentUrl };
      changed = true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[seo-image-refresh] Error on article=${article.id}, image=${i}:`, message);
      errors.push(`Article ${article.id}, image ${i}: ${message}`);
    }
  }

  if (!changed) return false;

  const { error: updateError } = await adminClient
    .from("seo_articles")
    .update({ image_urls: updated })
    .eq("id", article.id);

  if (updateError) {
    errors.push(`Failed updating article ${article.id}: ${updateError.message}`);
    return false;
  }

  return true;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const adminClient = getAdminClient();

    const { data: { user }, error: authError } = await adminClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await requireAdmin(adminClient, user.id);

    const body = await req.json().catch(() => ({} as Record<string, unknown>));

    let articles: SeoArticleRow[] = [];

    if (typeof body.article_id === "string" && body.article_id.length > 0) {
      const { data, error } = await adminClient
        .from("seo_articles")
        .select("id, keyword, status, outline, image_urls")
        .eq("id", body.article_id)
        .single();
      if (error || !data) throw new Error(`Article not found: ${error?.message ?? "unknown"}`);
      articles = [data as SeoArticleRow];
    } else if (body.refresh_all === true) {
      const { data, error } = await adminClient
        .from("seo_articles")
        .select("id, keyword, status, outline, image_urls")
        .not("image_urls", "is", null);
      if (error) throw new Error(`Query error: ${error.message}`);
      articles = (data ?? []) as SeoArticleRow[];
    } else {
      return new Response(JSON.stringify({ error: "Provide article_id or refresh_all: true" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let refreshedCount = 0;
    const errors: string[] = [];

    for (const article of articles) {
      const refreshed = await refreshArticle(adminClient, article, errors);
      if (refreshed) refreshedCount += 1;
    }

    return new Response(
      JSON.stringify({
        success: true,
        refreshed_count: refreshedCount,
        total_processed: articles.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Admin access required" ? 403 : 500;
    console.error("[seo-image-refresh] Fatal:", message);
    return new Response(JSON.stringify({ error: message }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
