import "https://deno.land/std@0.168.0/dotenv/load.ts";
import { createClient } from "../_shared/deps.ts";
import { getCorsHeaders } from "../_shared/security.ts";

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    // ── Authentication ──────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ status: "erreur", message: "Non autorisé" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ status: "erreur", message: "Token invalide ou expiré" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(`[analyse-repas] Authenticated user: ${user.id}`);

    // ── Parse form data ─────────────────────────────────────────────────
    const formData = await req.formData();
    const image = formData.get("image") as File | null;
    const requestId = formData.get("request_id") as string | null;

    if (!image) {
      return new Response(
        JSON.stringify({ status: "erreur", message: "Aucune image reçue" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Read cost from feature_costs table ───────────────────────────────
    const { data: costRow } = await supabaseAdmin
      .from('feature_costs')
      .select('cost')
      .eq('feature', 'scan_repas')
      .single();
    const SCAN_COST = costRow?.cost ?? 4;

    // ── Idempotency check ───────────────────────────────────────────────
    if (requestId) {
      const { data: existing } = await supabaseAdmin
        .from('credit_transactions')
        .select('id')
        .eq('idempotency_key', `scanrepas:${requestId}`)
        .maybeSingle();
      
      if (existing) {
        console.log('[analyse-repas] Duplicate request_id, skipping charge');
        // Don't re-charge but still process the image
      } else {
        // Consume credits
        const { data: creditsResult, error: creditsError } = await supabaseAdmin.rpc('check_and_consume_credits', {
          p_user_id: user.id,
          p_feature: 'scanrepas',
          p_cost: SCAN_COST,
        });

        if (creditsError) {
          console.error('[analyse-repas] Credits error:', creditsError);
          return new Response(
            JSON.stringify({ status: "erreur", message: "Erreur lors de la vérification des crédits." }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        const creditsData = creditsResult as { success: boolean; error_code?: string; current_balance?: number };
        if (!creditsData.success) {
          return new Response(
            JSON.stringify({ 
              status: "erreur",
              error_code: "INSUFFICIENT_CREDITS",
              message: "Crédits insuffisants",
              current_balance: creditsData.current_balance,
              required: SCAN_COST,
            }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        // Tag transaction with idempotency key
        if (requestId) {
          await supabaseAdmin
            .from('credit_transactions')
            .update({ idempotency_key: `scanrepas:${requestId}` })
            .eq('user_id', user.id)
            .eq('feature', 'scanrepas')
            .is('idempotency_key', null)
            .order('created_at', { ascending: false })
            .limit(1);
        }
      }
    } else {
      // No request_id: consume credits without idempotency (backward compat)
      const { data: creditsResult, error: creditsError } = await supabaseAdmin.rpc('check_and_consume_credits', {
        p_user_id: user.id,
        p_feature: 'scanrepas',
        p_cost: SCAN_COST,
      });

      if (creditsError) {
        return new Response(
          JSON.stringify({ status: "erreur", message: "Erreur lors de la vérification des crédits." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const creditsData = creditsResult as { success: boolean; error_code?: string; current_balance?: number };
      if (!creditsData.success) {
        return new Response(
          JSON.stringify({ 
            status: "erreur",
            error_code: "INSUFFICIENT_CREDITS",
            message: "Crédits insuffisants",
            current_balance: creditsData.current_balance,
            required: SCAN_COST,
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    console.log(`[analyse-repas] Credits consumed (cost: ${SCAN_COST})`);

    // ── Encode image ────────────────────────────────────────────────────
    const arrayBuffer = await image.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 8192) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    }
    const base64 = btoa(binary);
    const mimeType = image.type || "image/jpeg";

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      console.error("[analyse-repas] OPENAI_API_KEY not set");
      return new Response(
        JSON.stringify({ status: "erreur", message: "Clé API OpenAI manquante côté serveur." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── OpenAI call ─────────────────────────────────────────────────────
    const prompt = `Analyse ce repas et retourne UNIQUEMENT un objet JSON valide, sans markdown ni texte autour, avec exactement ces champs :
{
  "status": "succès",
  "nom_du_plat": "",
  "description": "",
  "aliments": [{ "nom": "", "quantité": "", "calories": 0, "protéines": 0, "glucides": 0, "lipides": 0 }],
  "total": { "calories": 0, "protéines": 0, "glucides": 0, "lipides": 0 },
  "micronutriments_notables": [],
  "analyse_nutritionnelle": "",
  "recommandations": [],
  "confiance_estimation": 0,
  "hypotheses": [],
  "incertitudes": [{ "champ": "", "raison": "", "valeur_possible": null }]
}
Tous les champs en français. Si incertain sur un ingrédient, mets les macros à null.
Les hypothèses doivent contenir 2 à 5 éléments décrivant les estimations faites.
Le champ confiance_estimation est un entier de 0 à 100.`;

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        max_tokens: 1500,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: `data:${mimeType};base64,${base64}` },
              },
              { type: "text", text: prompt },
            ],
          },
        ],
      }),
    });

    if (!openaiResponse.ok) {
      const errBody = await openaiResponse.text();
      console.error("[analyse-repas] OpenAI error:", openaiResponse.status, errBody.substring(0, 500));
      return new Response(
        JSON.stringify({ status: "erreur", message: `Erreur OpenAI (${openaiResponse.status})` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aiData = await openaiResponse.json();
    const content: string = aiData.choices?.[0]?.message?.content ?? "";
    const cleaned = content.replace(/```json|```/g, "").trim();

    let result: Record<string, unknown>;
    try {
      result = JSON.parse(cleaned);
    } catch {
      console.error("[analyse-repas] Failed to parse GPT response:", cleaned.substring(0, 300));
      return new Response(
        JSON.stringify({ status: "erreur", message: "Réponse IA invalide (JSON attendu)." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[analyse-repas] Unhandled error:", error);
    const origin = req.headers.get("origin");
    const corsHeaders = getCorsHeaders(origin);
    return new Response(
      JSON.stringify({ status: "erreur", message: "Une erreur inattendue est survenue." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
