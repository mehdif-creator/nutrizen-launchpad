/**
 * analyze-fridge: Direct OpenAI vision call for Inspi Frigo
 * 
 * Accepts JSON { image_base64: string, request_id: string }
 * Returns { status, plat } or error
 * Credits: deducted ONLY after successful API response
 */
import { createClient } from '../_shared/deps.ts';
import { getCorsHeaders, generateRequestId, Logger, logEdgeFunctionError } from '../_shared/security.ts';

const FEATURE_KEY = 'inspi_frigo';
const DEFAULT_COST = 6;

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const reqId = generateRequestId();
  const logger = new Logger(reqId, 'analyze-fridge');

  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Non authentifié' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      logger.error('Auth failed', authError);
      return new Response(
        JSON.stringify({ error: 'Non authentifié' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.info('User authenticated', { userId: user.id });

    // ── Parse body ───────────────────────────────────────────────────────────
    const body = await req.json();
    const { image_base64, request_id } = body as { image_base64?: string; request_id?: string };

    if (!image_base64 || typeof image_base64 !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Image manquante. Veuillez sélectionner une photo.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!request_id || typeof request_id !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Identifiant de requête manquant.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Idempotency check ────────────────────────────────────────────────────
    const idempotencyKey = `inspi_frigo:${request_id}`;

    const { data: existingTx } = await supabaseAdmin
      .from('credit_transactions')
      .select('id')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();

    if (existingTx) {
      logger.info('Duplicate request detected', { request_id });
      return new Response(
        JSON.stringify({ duplicate: true, error: 'Requête déjà traitée. Aucun crédit supplémentaire débité.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Get cost from feature_costs table ────────────────────────────────────
    let cost = DEFAULT_COST;
    const { data: costRow } = await supabaseAdmin
      .from('feature_costs')
      .select('cost')
      .eq('feature', FEATURE_KEY)
      .maybeSingle();

    if (costRow?.cost) {
      cost = costRow.cost;
    }
    logger.info('Feature cost resolved', { cost });

    // ── Pre-check balance (read-only) — actual deduction AFTER successful API call ──
    const { data: walletPreCheck } = await supabaseAdmin
      .from('user_wallets')
      .select('subscription_credits, lifetime_credits')
      .eq('user_id', user.id)
      .maybeSingle();
    const preCheckBalance = (walletPreCheck?.subscription_credits ?? 0) + (walletPreCheck?.lifetime_credits ?? 0);

    if (preCheckBalance < cost) {
      return new Response(
        JSON.stringify({
          error: 'Crédits insuffisants pour cette fonctionnalité.',
          error_code: 'INSUFFICIENT_CREDITS',
          current_balance: preCheckBalance,
          required: cost,
        }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Call OpenAI GPT-4o ───────────────────────────────────────────────────
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      logger.error('OPENAI_API_KEY not configured');
      // NO credit deduction on config error
      return new Response(
        JSON.stringify({ error: 'Configuration serveur manquante. Aucun crédit débité.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract base64 data (remove data URL prefix if present)
    const base64Clean = image_base64.replace(/^data:image\/\w+;base64,/, '');
    // Determine mime type
    const mimeMatch = image_base64.match(/^data:(image\/\w+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

    const prompt = `Analyse cette photo de frigo ou d'ingrédients et retourne UNIQUEMENT un objet JSON valide, sans markdown ni texte autour, avec exactement ces champs :
{
  "status": "succès",
  "plat": {
    "nom": "Nom du plat suggéré",
    "description": "Description courte du plat",
    "ingredients_identifiés": [{ "nom": "nom de l'ingrédient", "quantité_estimée": "quantité" }],
    "recette": {
      "étapes": ["étape 1", "étape 2"],
      "temps_préparation": "15 min",
      "temps_cuisson": "20 min",
      "portions": 4
    },
    "note_nutritionnelle": "Commentaire nutritionnel"
  }
}
Tous les champs en français. Propose un seul plat réalisable avec les ingrédients visibles.`;

    logger.info('Calling OpenAI GPT-4o...');

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${base64Clean}` },
            },
            { type: 'text', text: prompt },
          ],
        }],
      }),
      signal: AbortSignal.timeout(90000),
    });

    if (!openaiResponse.ok) {
      const errBody = await openaiResponse.text();
      logger.error('OpenAI error', new Error(errBody.substring(0, 500)), { status: openaiResponse.status });
      // NO credit deduction on API failure
      return new Response(
        JSON.stringify({ error: "L'analyse a échoué. Aucun crédit débité. Réessayez." }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await openaiResponse.json();
    const content: string = data.choices?.[0]?.message?.content ?? '';
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let analysisResult: Record<string, unknown>;
    try {
      analysisResult = JSON.parse(cleaned);
    } catch {
      logger.error('Failed to parse GPT response', new Error(cleaned.substring(0, 300)));
      // NO credit deduction on invalid response
      return new Response(
        JSON.stringify({ error: "L'IA a renvoyé une réponse invalide. Aucun crédit débité." }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── SUCCESS: Now deduct credits atomically ──
    logger.info('Deducting credits after successful analysis');
    
    const { error: debitError } = await supabaseAdmin.rpc('check_and_consume_credits', {
      p_user_id: user.id,
      p_feature: FEATURE_KEY,
      p_cost: cost,
    });

    if (debitError) {
      logger.error('Credit deduction error after success', debitError);
      // Still return the result
    } else {
      // Record idempotency
      await supabaseAdmin.from('credit_transactions')
        .update({ idempotency_key: idempotencyKey })
        .eq('user_id', user.id)
        .eq('feature', FEATURE_KEY)
        .is('idempotency_key', null)
        .order('created_at', { ascending: false })
        .limit(1);
    }

    logger.info('Analysis successful, credits debited');

    return new Response(
      JSON.stringify({
        success: true,
        ...analysisResult,
        credits_charged: cost,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logger.error('Unhandled error', error);
    await logEdgeFunctionError('analyze-fridge', error);
    // NO credits deducted on unhandled errors
    return new Response(
      JSON.stringify({ error: 'Erreur inattendue. Aucun crédit débité. Veuillez réessayer.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});