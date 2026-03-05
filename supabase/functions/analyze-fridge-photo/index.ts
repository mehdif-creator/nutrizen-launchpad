import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from '../_shared/deps.ts';
import { getCorsHeaders } from '../_shared/security.ts';

const FEATURE_KEY = 'inspi_frigo';
const FEATURE_COST = 6;

const SYSTEM_PROMPT = `Tu es un chef cuisinier expert et nutritionniste. 
Ton rôle est d'analyser une photo de frigo ou d'ingrédients, puis de proposer des recettes réalisables.

INSTRUCTIONS :
- Identifie précisément tous les ingrédients visibles sur la photo avec leur quantité estimée.
- Propose entre 2 et 4 recettes réalisables UNIQUEMENT avec ces ingrédients (sel, poivre, huile, eau autorisés).
- Chaque recette doit être simple, pratique et détaillée.
- Réponds UNIQUEMENT en JSON valide, sans markdown, sans texte autour.

FORMAT DE RÉPONSE OBLIGATOIRE :
{
  "ingredients_identifies": [
    { "nom": "string", "quantite": "string" }
  ],
  "recettes": [
    {
      "nom": "string",
      "description": "string (1 phrase accrocheuse)",
      "difficulte": "Facile | Moyen | Difficile",
      "temps_preparation": "string (ex: 10 min)",
      "temps_cuisson": "string (ex: 20 min)",
      "portions": number,
      "ingredients_necessaires": ["string"],
      "etapes": ["string"],
      "note_nutritionnelle": "string"
    }
  ]
}

Si l'image est illisible ou ne contient pas d'ingrédients, retourne :
{ "error": "Image non exploitable" }`;

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── Auth ──
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[analyze-fridge-photo] User authenticated:', user.id);

    // ── Parse body ──
    const body = await req.json();
    const { image } = body;

    if (!image || typeof image !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Le champ "image" est requis (base64 data URL).' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Credits: check & consume atomically ──
    console.log('[analyze-fridge-photo] Checking credits for user:', user.id);
    const { data: creditsCheck, error: creditsError } = await supabaseClient.rpc('check_and_consume_credits', {
      p_user_id: user.id,
      p_feature: FEATURE_KEY,
      p_cost: FEATURE_COST,
    });

    if (creditsError) {
      console.error('[analyze-fridge-photo] Credits check error:', creditsError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la vérification des crédits' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!creditsCheck.success) {
      console.log('[analyze-fridge-photo] Insufficient credits:', creditsCheck);
      return new Response(
        JSON.stringify({
          error_code: 'INSUFFICIENT_CREDITS',
          error: creditsCheck.message || 'Crédits insuffisants',
          current_balance: creditsCheck.current_balance,
          required: creditsCheck.required,
        }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[analyze-fridge-photo] Credits consumed, calling OpenAI...');

    // ── Call OpenAI GPT-4o ──
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const base64Data = image.includes(',') ? image.split(',')[1] : image;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 2000,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: `data:image/jpeg;base64,${base64Data}`, detail: 'high' },
              },
              {
                type: 'text',
                text: 'Analyse cette photo et propose-moi des recettes avec ce que tu vois.',
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[analyze-fridge-photo] OpenAI error:', response.status, errorText);

      // Refund credits on AI failure
      console.log('[analyze-fridge-photo] Refunding credits after AI failure');
      await supabaseClient.rpc('refund_credits', {
        p_user_id: user.id,
        p_feature: FEATURE_KEY,
        p_amount: FEATURE_COST,
      }).catch(e => console.error('[analyze-fridge-photo] Refund error:', e));

      throw new Error(`Erreur OpenAI : ${response.status}`);
    }

    const openaiData = await response.json();
    const content = openaiData.choices?.[0]?.message?.content;

    if (!content) {
      // Refund on empty response
      await supabaseClient.rpc('refund_credits', {
        p_user_id: user.id,
        p_feature: FEATURE_KEY,
        p_amount: FEATURE_COST,
      }).catch(e => console.error('[analyze-fridge-photo] Refund error:', e));

      throw new Error("Réponse vide d'OpenAI");
    }

    // Clean potential markdown fencing
    const cleaned = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned);

    if (parsed.error) {
      // Refund if image was not exploitable
      await supabaseClient.rpc('refund_credits', {
        p_user_id: user.id,
        p_feature: FEATURE_KEY,
        p_amount: FEATURE_COST,
      }).catch(e => console.error('[analyze-fridge-photo] Refund error:', e));

      throw new Error(parsed.error);
    }

    console.log('[analyze-fridge-photo] Analysis completed', {
      ingredientsCount: parsed.ingredients_identifies?.length,
      recipesCount: parsed.recettes?.length,
    });

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[analyze-fridge-photo] Error:', error);
    const msg = error instanceof Error ? error.message : 'Erreur inconnue';
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
