import { createClient } from '../_shared/deps.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { checkRateLimit, rateLimitExceededResponse } from '../_shared/rateLimit.ts';

const ALLOWED_ORIGINS = [
  'https://mynutrizen.fr',
  'https://app.mynutrizen.fr',
  'https://www.mynutrizen.fr',
  'http://localhost:5173',
  'http://localhost:3000',
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  const isAllowed = origin && ALLOWED_ORIGINS.includes(origin);
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
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
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Rate limiting ─────────────────────────────────────────────────────────
    const rl = await checkRateLimit(supabaseClient, {
      identifier: `user:${user.id}`,
      endpoint:   'analyze-fridge',
      maxTokens:  5,
      refillRate: 5,
      cost:       600,
    });
    if (!rl.allowed) return rateLimitExceededResponse(corsHeaders, rl.retryAfter);

    console.log('User authenticated:', user.id);

    // Check and consume credits BEFORE running analysis
    console.log('[analyze-fridge] Checking credits for user:', user.id);
    const { data: creditsCheck, error: creditsError } = await supabaseClient.rpc('check_and_consume_credits', {
      p_user_id: user.id,
      p_feature: 'inspifrigo',
      p_cost: 1
    });

    if (creditsError) {
      console.error('[analyze-fridge] Credits check error:', creditsError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la vérification des crédits' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!creditsCheck.success) {
      console.log('[analyze-fridge] Insufficient credits:', creditsCheck);
      return new Response(
        JSON.stringify({ 
          error_code: creditsCheck.error_code,
          error: creditsCheck.message || 'Crédits insuffisants',
          current_balance: creditsCheck.current_balance,
          required: creditsCheck.required
        }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[analyze-fridge] Credits consumed, proceeding with analysis');

    // Get the form data from the request
    const formData = await req.formData();
    const image = formData.get('image');
    
    if (!image || !(image instanceof File)) {
      throw new Error('No valid image provided');
    }
    
    // Validate file size (max 10MB)
    if (image.size > 10 * 1024 * 1024) {
      throw new Error('Image file too large (max 10MB)');
    }
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(image.type)) {
      throw new Error('Invalid image type. Allowed: JPEG, PNG, WebP');
    }

    // Convert image to base64
    const arrayBuffer = await image.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 8192) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    }
    const base64 = btoa(binary);
    const mimeType = image.type || 'image/jpeg';

    // Check OpenAI API key
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      console.error('[analyze-fridge] OPENAI_API_KEY not set');
      throw new Error('Configuration manquante côté serveur');
    }

    console.log('[analyze-fridge] Calling OpenAI GPT-4o...');

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
              image_url: { url: `data:${mimeType};base64,${base64}` }
            },
            { type: 'text', text: prompt }
          ]
        }]
      }),
      signal: AbortSignal.timeout(90000),
    });

    if (!openaiResponse.ok) {
      const errBody = await openaiResponse.text();
      console.error('[analyze-fridge] OpenAI error:', openaiResponse.status, errBody.substring(0, 500));
      throw new Error(`Erreur OpenAI (${openaiResponse.status})`);
    }

    const data = await openaiResponse.json();
    const content: string = data.choices?.[0]?.message?.content ?? '';
    const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let result: Record<string, unknown>;
    try {
      result = JSON.parse(cleaned);
    } catch {
      console.error('[analyze-fridge] Failed to parse GPT response:', cleaned.substring(0, 300));
      throw new Error('Réponse IA invalide (JSON attendu)');
    }

    console.log('[analyze-fridge] Analysis successful');

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-fridge function:', error);
    
    const userMessage = error instanceof Error && 
      (error.message.includes('Image') || error.message.includes('configuration') || error.message.includes('OpenAI'))
      ? error.message 
      : 'Unable to analyze fridge contents. Please try again.';
    
    return new Response(
      JSON.stringify({ 
        error: userMessage,
        status: 'error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});