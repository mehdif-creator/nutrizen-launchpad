import { createClient } from '../_shared/deps.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SYSTEM_SUPPORT = `Tu es l'assistant support de NutriZen, une application de création de menus personnalisés.

TON RÔLE STRICT : Répondre UNIQUEMENT aux questions techniques sur l'application NutriZen.
Sujets autorisés :
- Fonctionnement de l'application (menus personnalisés, Inspi Frigo, Scan Repas, crédits)
- Problèmes techniques (connexion, synchronisation, bugs, interface)
- Abonnements et crédits (achats, utilisation, recharge)
- Navigation dans l'app (où trouver telle fonctionnalité)

INTERDICTIONS ABSOLUES — Si l'utilisateur demande l'une des choses suivantes, refuse poliment et redirige :
- Recettes de cuisine (même "rapides" ou "simples")
- Plans alimentaires ou menus personnalisés
- Conseils nutritionnels, calculs de calories, macros
- Conseils médicaux ou de santé
- Toute question non liée à l'application NutriZen

Si la question sort de ton périmètre, réponds exactement :
"Cette question dépasse mon périmètre de support. Pour des conseils nutritionnels personnalisés, utilisez la fonctionnalité Assistant Nutrition (2 crédits par message) disponible dans ce chat."

Langue : Français exclusivement. Vouvoiement obligatoire (vous/votre).
Sois concis, professionnel et bienveillant.`;

const SYSTEM_NUTRITION = `Tu es l'assistant nutrition de NutriZen, une application de création de menus personnalisés.

TON RÔLE : Fournir des conseils nutritionnels personnalisés de qualité professionnelle.
Sujets autorisés :
- Conseils nutritionnels et équilibres alimentaires
- Suggestions de repas et d'aliments (sans donner de recettes détaillées complètes)
- Objectifs santé et bien-être via l'alimentation
- Compléments aux menus générés par NutriZen
- Questions sur les régimes alimentaires (végétarien, sans gluten, etc.)

INTERDICTIONS ABSOLUES :
- Recettes complètes étape par étape (renvoie vers la fonction Inspi Frigo de NutriZen)
- Conseils médicaux ou diagnostics de maladies
- Substitution à un professionnel de santé
- Sujets hors nutrition et alimentation

Si l'utilisateur demande une recette complète, réponds :
"Pour des recettes détaillées, utilisez directement la fonctionnalité **Inspi Frigo** dans NutriZen — elle génère des recettes adaptées à vos ingrédients disponibles !"

Langue : Français exclusivement. Vouvoiement obligatoire (vous/votre).
Sois chaleureux, expert et engageant. Réponds de façon structurée mais naturelle.`;

const CHAT_NUTRITION_COST = 2;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify user
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { mode, messages } = await req.json();
    if (!mode || !messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Paramètres invalides' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // For nutrition mode: check credits first, consume after success
    const adminClient = createClient(supabaseUrl, supabaseKey);

    if (mode === 'nutrition') {
      // Check balance (read-only)
      const { data: wallet } = await adminClient
        .from('user_wallets')
        .select('subscription_credits, lifetime_credits')
        .eq('user_id', user.id)
        .single();

      const total = (wallet?.subscription_credits ?? 0) + (wallet?.lifetime_credits ?? 0);
      if (total < CHAT_NUTRITION_COST) {
        return new Response(JSON.stringify({ error: 'Crédits insuffisants', error_code: 'INSUFFICIENT_CREDITS' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Call OpenAI
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const systemPrompt = mode === 'nutrition' ? SYSTEM_NUTRITION : SYSTEM_SUPPORT;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.slice(-10),
        ],
        stream: true,
        max_tokens: 800,
        temperature: 0.7,
      }),
    });

    if (!openaiResponse.ok) {
      const errText = await openaiResponse.text();
      console.error('OpenAI error:', openaiResponse.status, errText);
      throw new Error(`OpenAI error: ${openaiResponse.status}`);
    }

    // Post-success credit deduction for nutrition mode
    if (mode === 'nutrition') {
      const { data: creditResult, error: creditError } = await adminClient.rpc('check_and_consume_credits', {
        p_user_id: user.id,
        p_feature: 'chat_nutrition',
        p_cost: CHAT_NUTRITION_COST,
      });

      if (creditError || !(creditResult as any)?.success) {
        console.error('Credit deduction failed:', creditError, creditResult);
        // Don't block the response — credits checked before, deduction is best-effort
      }
    }

    // Stream the SSE response back
    return new Response(openaiResponse.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (e) {
    console.error('nutrizen-chat error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Erreur interne' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
