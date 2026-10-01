import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/security.ts";
import { requireAdmin } from "../_shared/auth.ts";

function getAdminClient() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

const STYLE_SUFFIX =
  "Professional French food lifestyle photography, soft natural lighting, bright airy clean background, soft greens and warm whites palette, natural wood tones, modern French kitchen aesthetic. Absolutely no text, no words, no letters, no captions, no labels, no logos, no watermark. High resolution.";

function buildPrompt(rawPrompt: string, context: string): string {
  const base = rawPrompt?.trim() || "Healthy balanced meal on a white ceramic plate with fresh colorful vegetables";
  return `${base}. Context: ${context}. ${STYLE_SUFFIX}`;
}

async function generateImageViaGateway(prompt: string): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  // OpenAI image generations endpoint (gpt-image-2.5-sunburst).
  // Landscape 1536x1024 fits blog hero/section slots.
  const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai/gpt-image-2.5-sunburst",
      prompt,
      size: "1536x1024",
      n: 1,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("[seo-image-gen] Gateway error:", res.status, errText);
    if (res.status === 429) throw new Error("Rate limit atteint sur le AI Gateway. Réessayez dans une minute.");
    if (res.status === 402) throw new Error("Crédits AI Gateway épuisés. Ajoutez des crédits dans Settings > Workspace > Usage.");
    throw new Error(`AI Gateway error ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const imageCall = (data?.output || []).find((o: any) => o.type === "image_generation_call" && o.result);
  if (!imageCall?.result) {
    throw new Error("AI Gateway: empty image response");
  }
  return `data:image/png;base64,${imageCall.result}`;
}

function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; mime: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Invalid data URL");
  const mime = match[1];
  const b64 = match[2];
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return { bytes, mime };
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
      return new Response(JSON.stringify({ error: "Invalid or expired token" }), { status: 401, headers: corsHeaders });
    }
    await requireAdmin(adminClient, user.id);

    const { article_id } = await req.json();
    if (!article_id) {
      return new Response(JSON.stringify({ error: "article_id is required" }), { status: 400, headers: corsHeaders });
    }

    const { data: article, error } = await adminClient.from("seo_articles").select("*").eq("id", article_id).single();
    if (error) throw new Error(`Article not found: ${error.message}`);

    if (article.status !== "outline_done") {
      return new Response(JSON.stringify({ error: `Invalid status: ${article.status}. Expected outline_done.` }), { status: 400, headers: corsHeaders });
    }

    const outline = article.outline as any;
    const articleContext = `${outline.title || ""} - ${outline.meta_description || ""}`;

    async function storeImage(dataUrl: string, imgIndex: number): Promise<string> {
      const { bytes, mime } = dataUrlToBytes(dataUrl);
      const ext = mime.includes("jpeg") || mime.includes("jpg") ? "jpg" : "png";
      const fileName = `seo-${article_id}-${imgIndex}-${Date.now()}.${ext}`;
      const { error: uploadError } = await adminClient.storage
        .from("seo-images")
        .upload(fileName, bytes, {
          contentType: mime,
          upsert: false,
          cacheControl: "31536000",
        });
      if (uploadError) {
        console.error("[seo-image-gen] Storage upload failed:", uploadError);
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }
      const { data: { publicUrl } } = adminClient.storage.from("seo-images").getPublicUrl(fileName);
      return publicUrl;
    }

    // Build job list: hero + up to 2 sections (to keep total runtime safe)
    type Job = { prompt: string; alt: string; type: "hero" | "section" };
    const jobs: Job[] = [];

    if (outline.hero_image_prompt) {
      jobs.push({
        prompt: buildPrompt(outline.hero_image_prompt, articleContext),
        alt: outline.hero_image_alt || "",
        type: "hero",
      });
    }

    const sectionsWithImages = (outline.sections || [])
      .filter((s: any) => s.image_prompt)
      .slice(0, 2);

    for (const section of sectionsWithImages) {
      jobs.push({
        prompt: buildPrompt(section.image_prompt, `${articleContext} - Section: ${section.h2}`),
        alt: section.image_alt || section.h2,
        type: "section",
      });
    }

    console.log(`[seo-image-gen] Generating ${jobs.length} images in parallel via AI Gateway...`);

    // Parallel generation + upload
    const results = await Promise.all(
      jobs.map(async (job, idx) => {
        try {
          const dataUrl = await generateImageViaGateway(job.prompt);
          const publicUrl = await storeImage(dataUrl, idx);
          console.log(`[seo-image-gen] ✓ Image ${idx} (${job.type}) done`);
          return { url: publicUrl, alt: job.alt, type: job.type };
        } catch (err) {
          console.error(`[seo-image-gen] ✗ Image ${idx} (${job.type}) failed:`, err);
          return null;
        }
      })
    );

    const imageUrls = results.filter((r): r is { url: string; alt: string; type: string } => r !== null);

    if (imageUrls.length === 0) {
      throw new Error("All image generations failed");
    }

    await adminClient.from("seo_articles").update({
      image_urls: imageUrls,
      status: "images_done",
      error_message: null,
    }).eq("id", article_id);

    return new Response(JSON.stringify({ article_id, image_urls: imageUrls, count: imageUrls.length }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("[seo-image-gen] Error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    const status = (err as any)?.status || (msg === "Admin access required" ? 403 : 500);
    return new Response(JSON.stringify({ error: msg }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
