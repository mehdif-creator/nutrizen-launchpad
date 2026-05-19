import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/security.ts";
import { requireAdmin } from "../_shared/auth.ts";

function getAdminClient() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

const IMAGE_REFINEMENT_SYSTEM = `
You are a visual art director for NutriZen, a French nutrition app.
You write optimized DALL-E 3 prompts that produce lifestyle photography consistent with the NutriZen brand.

NUTRIZEN VISUAL IDENTITY:
- Style: realistic lifestyle photography, bright and airy, clean backgrounds
- Color palette: soft greens, warm whites, natural wood tones, fresh food colors
- Mood: positive, approachable, modern French kitchen or dining aesthetic
- NEVER include: ANY text, words, letters, numbers, captions, labels, titles, logos, watermarks, measuring tapes, scales, before/after imagery
- CRITICAL: The image must contain ABSOLUTELY NO TEXT of any kind. No overlays, no captions, no labels, no words whatsoever.

OUTPUT FORMAT: Return ONLY a refined DALL-E 3 prompt string ending with:
"Professional food lifestyle photography, soft natural lighting, absolutely no text, no words, no letters, no captions, no watermark, high resolution, French aesthetic."
`;

async function refinePrompt(rawDirection: string, articleContext: string): Promise<string> {
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-5",
      max_completion_tokens: 2000,
      reasoning_effort: "minimal",
      messages: [
        { role: "system", content: IMAGE_REFINEMENT_SYSTEM },
        { role: "user", content: `Refine this image direction into an optimized DALL-E 3 prompt.\n\nRAW DIRECTION: "${rawDirection}"\nARTICLE CONTEXT: "${articleContext}"\n\nReturn only the refined DALL-E 3 prompt string.` },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI refinement error ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || rawDirection;
}

async function generateImage(prompt: string, size: string): Promise<string> {
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
  // gpt-image-2 supported sizes: 1024x1024, 1024x1536, 1536x1024, auto
  const normalizedSize =
    size === "1792x1024" ? "1536x1024" :
    size === "1024x1792" ? "1024x1536" :
    size;
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-image-2",
      prompt,
      n: 1,
      size: normalizedSize,
      quality: "high",
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error("[seo-image-gen] gpt-image-2 error:", res.status, errText);
    throw new Error(`gpt-image-2 error ${res.status}: ${errText}`);
  }
  const data = await res.json();
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error("gpt-image-2: empty image response");
  return `data:image/png;base64,${b64}`;
}

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

    if (!Deno.env.get("OPENAI_API_KEY")) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY not configured" }), { status: 500, headers: corsHeaders });
    }

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
    const imageUrls: { url: string; alt: string; type: string }[] = [];

    // Helper: download DALL-E image and store permanently in Supabase Storage
    async function storeImage(tempUrl: string, imgIndex: number): Promise<string> {
      try {
        const imgResponse = await fetch(tempUrl);
        if (!imgResponse.ok) throw new Error(`Download failed: ${imgResponse.status}`);
        const imgBuffer = await imgResponse.arrayBuffer();
        const fileName = `seo-${article_id}-${imgIndex}-${Date.now()}.png`;
        const { error: uploadError } = await adminClient.storage
          .from("seo-images")
          .upload(fileName, imgBuffer, {
            contentType: "image/png",
            upsert: false,
            cacheControl: "31536000",
          });
        if (uploadError) {
          console.error("[seo-image-gen] Storage upload failed:", uploadError);
          return tempUrl; // fallback to temporary URL
        }
        const { data: { publicUrl } } = adminClient.storage.from("seo-images").getPublicUrl(fileName);
        return publicUrl;
      } catch (err) {
        console.error("[seo-image-gen] Store image failed:", err);
        return tempUrl;
      }
    }

    let imgIdx = 0;

    if (outline.hero_image_prompt) {
      console.log("[seo-image-gen] Generating hero image...");
      const refinedPrompt = await refinePrompt(outline.hero_image_prompt, articleContext);
      const tempUrl = await generateImage(refinedPrompt, "1792x1024");
      const permanentUrl = await storeImage(tempUrl, imgIdx++);
      imageUrls.push({ url: permanentUrl, alt: outline.hero_image_alt || "", type: "hero" });
    }

    const sectionsWithImages = (outline.sections || [])
      .filter((s: any) => s.image_prompt)
      .slice(0, 3);

    for (const section of sectionsWithImages) {
      console.log(`[seo-image-gen] Generating section image for: ${section.h2}`);
      const refinedPrompt = await refinePrompt(section.image_prompt, `${articleContext} - Section: ${section.h2}`);
      const tempUrl = await generateImage(refinedPrompt, "1024x1024");
      const permanentUrl = await storeImage(tempUrl, imgIdx++);
      imageUrls.push({ url: permanentUrl, alt: section.image_alt || section.h2, type: "section" });
    }

    await adminClient.from("seo_articles").update({
      image_urls: imageUrls,
      status: "images_done",
      error_message: null,
    }).eq("id", article_id);

    return new Response(JSON.stringify({ article_id, image_urls: imageUrls }), {
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
