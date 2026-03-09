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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

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

    // ── Pre-check balance (read-only) — actual deduction AFTER successful API call ──
    console.log('[analyze-fridge-photo] Pre-checking credits for user:', user.id);
    const { data: walletPreCheck } = await supabaseAdmin
      .from('user_wallets')
      .select('subscription_credits, lifetime_credits')
      .eq('user_id', user.id)
      .maybeSingle();
    const preCheckBalance = (walletPreCheck?.subscription_credits ?? 0) + (walletPreCheck?.lifetime_credits ?? 0);

    if (preCheckBalance < FEATURE_COST) {
      console.log('[analyze-fridge-photo] Insufficient credits:', preCheckBalance);
      return new Response(
        JSON.stringify({
          error_code: 'INSUFFICIENT_CREDITS',
          error: 'Crédits insuffisants',
          current_balance: preCheckBalance,
          required: FEATURE_COST,
        }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Call OpenAI GPT-4o ──
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      // NO credit deduction on config error
      return new Response(
        JSON.stringify({ error: 'Configuration serveur manquante. Aucun crédit débité.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[analyze-fridge-photo] Calling OpenAI...');

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
      // NO credit deduction on API failure
      return new Response(
        JSON.stringify({ error: `Erreur du service IA (${response.status}). Aucun crédit débité.` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openaiData = await response.json();
    const content = openaiData.choices?.[0]?.message?.content;

    if (!content) {
      // NO credit deduction on empty response
      return new Response(
        JSON.stringify({ error: "Réponse vide du service IA. Aucun crédit débité." }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean potential markdown fencing
    const cleaned = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    
    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error('[analyze-fridge-photo] Failed to parse response:', cleaned.substring(0, 300));
      // NO credit deduction on invalid response
      return new Response(
        JSON.stringify({ error: "Réponse IA invalide. Aucun crédit débité." }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (parsed.error) {
      // NO credit deduction if image was not exploitable
      return new Response(
        JSON.stringify({ error: parsed.error + " Aucun crédit débité." }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── SUCCESS: Now deduct credits atomically ──
    console.log('[analyze-fridge-photo] Deducting credits after successful analysis');
    const { data: creditsCheck, error: creditsError } = await supabaseClient.rpc('check_and_consume_credits', {
      p_user_id: user.id,
      p_feature: FEATURE_KEY,
      p_cost: FEATURE_COST,
    });

    if (creditsError) {
      console.error('[analyze-fridge-photo] Credits deduction error after success:', creditsError);
      // Still return the result
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
    // NO credits deducted on unhandled errors
    const msg = error instanceof Error ? error.message : 'Erreur inconnue';
    return new Response(
      JSON.stringify({ error: msg + '. Aucun crédit débité.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});