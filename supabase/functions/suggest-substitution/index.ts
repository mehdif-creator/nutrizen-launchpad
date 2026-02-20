import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from '../_shared/deps.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { checkRateLimit, rateLimitExceededResponse } from '../_shared/rateLimit.ts';

const ALLOWED_ORIGINS = [
  'https://mynutrizen.fr',
  'https://app.mynutrizen.fr',
  'https://www.mynutrizen.fr',
  'http://localhost:5173',
  'http://localhost:3000',
  'https://id-preview--a4e7364c-6c94-4f23-85c6-e6adea1804c7.lovable.app',
  'https://nutrizen-launchpad.lovable.app',
];

const SUBSTITUTION_COST = 5;
const CACHE_DAYS = 30;

function getCorsHeaders(origin: string | null): Record<string, string> {
  const isAllowed = origin && ALLOWED_ORIGINS.some(o => origin.startsWith(o.replace('https://', '').replace('http://', '')));
  return {
    'Access-Control-Allow-Origin': origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

// Input validation schema
const SubstitutionSchema = z.object({
  ingredient: z.string().trim().min(1, { message: "Ingredient name required" }).max(100, { message: "Ingredient name too long" }),
  recipe_id: z.string().uuid().optional(),
  constraints: z.object({
    allergies: z.array(z.string()).optional(),
    diet: z.string().optional(),
    dislikes: z.array(z.string()).optional(),
  }).optional(),
}).strict();

// Generate cache key for idempotency
function generateCacheKey(userId: string, ingredient: string, recipeId?: string): string {
  const base = `${userId}:${ingredient.toLowerCase().trim()}`;
  return recipeId ? `${base}:${recipeId}` : base;
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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

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
      endpoint:   'suggest-substitution',
      maxTokens:  20,
      refillRate: 20,
      cost:       60,
    });
    if (!rl.allowed) return rateLimitExceededResponse(corsHeaders, rl.retryAfter);
    // ── End rate limiting ──────────────────────────────────────────────────────

    // Parse and validate input
    const body = await req.json();
    const validatedInput = SubstitutionSchema.parse(body);
    const { ingredient, recipe_id, constraints } = validatedInput;
    
    const cacheKey = generateCacheKey(user.id, ingredient, recipe_id);

    // Check cache first (no credits charged for cached results)
    const { data: cachedResult, error: cacheError } = await supabaseClient
      .from('ingredient_substitutions_cache')
      .select('result, expires_at')
      .eq('user_id', user.id)
      .eq('ingredient_name', ingredient.toLowerCase().trim())
      .eq('recipe_id', recipe_id || null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (cachedResult && !cacheError) {
      console.log('Returning cached substitutions for:', ingredient);
      return new Response(JSON.stringify({ 
        substitutions: cachedResult.result,
        cached: true,
        credits_charged: 0,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check and consume credits (idempotent)
    const idempotencyKey = `substitution:${cacheKey}:${new Date().toISOString().split('T')[0]}`;
    
    const { data: creditsResult, error: creditsError } = await supabaseAdmin.rpc('check_and_consume_credits', {
      p_user_id: user.id,
      p_feature: 'substitution',
      p_cost: SUBSTITUTION_COST,
    });

    if (creditsError) {
      console.error('Credits check error:', creditsError);
      return new Response(
        JSON.stringify({ error: 'Error checking credits' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const creditsData = creditsResult as { success: boolean; error_code?: string; current_balance?: number };

    if (!creditsData.success) {
      console.log('Insufficient credits for user:', user.id);
      return new Response(
        JSON.stringify({ 
          error: 'Insufficient credits',
          error_code: 'INSUFFICIENT_CREDITS',
          current_balance: creditsData.current_balance,
          required: SUBSTITUTION_COST,
        }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Credits consumed for substitution, user:', user.id);
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Build prompt with constraints
    let constraintText = '';
    if (constraints) {
      if (constraints.allergies?.length) {
        constraintText += ` Evite les allergenes: ${constraints.allergies.join(', ')}.`;
      }
      if (constraints.diet) {
        constraintText += ` Regime: ${constraints.diet}.`;
      }
      if (constraints.dislikes?.length) {
        constraintText += ` A eviter: ${constraints.dislikes.join(', ')}.`;
      }
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Tu es un expert en nutrition et cuisine. Suggere 5 alternatives saines pour remplacer un ingredient donne.${constraintText}
            
Reponds UNIQUEMENT en JSON valide avec ce format:
{
  "substitutions": [
    {
      "name": "Nom de l'alternative",
      "reason": "Pourquoi cette alternative fonctionne",
      "notes": "Conseils d'utilisation ou ajustements"
    }
  ]
}`
          },
          {
            role: 'user',
            content: `Suggere 5 alternatives saines pour remplacer: ${ingredient}`
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      console.error('AI gateway error:', response.status);
      throw new Error('AI gateway error');
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{"substitutions":[]}';
    
    let substitutionData;
    try {
      // Clean potential markdown code blocks
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      substitutionData = JSON.parse(cleanContent);
    } catch (e) {
      console.error('Failed to parse AI response:', content);
      substitutionData = { substitutions: [] };
    }

    // Cache the result
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + CACHE_DAYS);

    await supabaseClient
      .from('ingredient_substitutions_cache')
      .upsert({
        user_id: user.id,
        recipe_id: recipe_id || null,
        ingredient_name: ingredient.toLowerCase().trim(),
        constraints: constraints || {},
        result: substitutionData.substitutions || [],
        expires_at: expiresAt.toISOString(),
      }, {
        onConflict: 'user_id,ingredient_name,recipe_id',
      });

    return new Response(JSON.stringify({
      ...substitutionData,
      cached: false,
      credits_charged: SUBSTITUTION_COST,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error suggesting substitution:', error);
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ 
          error: 'Validation error',
          details: error.errors,
          substitutions: []
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      error: errorMessage,
      substitutions: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
