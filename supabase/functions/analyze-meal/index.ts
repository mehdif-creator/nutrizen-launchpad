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
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Processing meal analysis request');
    
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Authentication required', status: 'error' }),
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
        JSON.stringify({ error: 'Invalid authentication', status: 'error' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Rate limiting ─────────────────────────────────────────────────────────
    const rl = await checkRateLimit(supabaseClient, {
      identifier: `user:${user.id}`,
      endpoint:   'analyze-meal',
      maxTokens:  5,
      refillRate: 5,
      cost:       600,
    });
    if (!rl.allowed) return rateLimitExceededResponse(corsHeaders, rl.retryAfter);
    // ── End rate limiting ──────────────────────────────────────────────────────

    // Check subscription status
    const { data: subscription, error: subError } = await supabaseClient
      .from('subscriptions')
      .select('status, trial_end')
      .eq('user_id', user.id)
      .single();

    if (subError || !subscription) {
      console.error('Subscription check error:', subError);
      return new Response(
        JSON.stringify({ error: 'No active subscription found', status: 'error' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate subscription is active or trialing
    if (subscription.status !== 'active' && subscription.status !== 'trialing') {
      return new Response(
        JSON.stringify({ error: 'Active subscription required', status: 'error' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if trial has expired
    if (subscription.status === 'trialing' && subscription.trial_end) {
      const trialEnd = new Date(subscription.trial_end);
      if (trialEnd < new Date()) {
        return new Response(
          JSON.stringify({ error: 'Trial expired', status: 'error' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log('Authentication and subscription validated for user:', user.id);

    // Check and consume credits BEFORE running analysis
    console.log('[analyze-meal] Checking credits for user:', user.id)
    const { data: creditsCheck, error: creditsError } = await supabaseClient.rpc('check_and_consume_credits', {
      p_user_id: user.id,
      p_feature: 'scanrepas',
      p_cost: 1
    })

    if (creditsError) {
      console.error('[analyze-meal] Credits check error:', creditsError)
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la vérification des crédits', status: 'error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!creditsCheck.success) {
      console.log('[analyze-meal] Insufficient credits:', creditsCheck)
      return new Response(
        JSON.stringify({ 
          error_code: creditsCheck.error_code,
          error: creditsCheck.message || 'Crédits insuffisants',
          current_balance: creditsCheck.current_balance,
          required: creditsCheck.required,
          status: 'error'
        }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[analyze-meal] Credits consumed, proceeding with analysis')
    
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

    console.log('Image received, forwarding to n8n webhook...');

    // Use webhook URL from environment variable
    const webhookUrl = Deno.env.get('N8N_ANALYZE_MEAL_WEBHOOK');
    if (!webhookUrl) {
      console.error('N8N_ANALYZE_MEAL_WEBHOOK not configured');
      throw new Error('Webhook configuration missing');
    }

    // Forward to n8n webhook with 60 second timeout
    const n8nFormData = new FormData();
    n8nFormData.append('image', image);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 seconds

    const response = await fetch(webhookUrl, {
      method: 'POST',
      body: n8nFormData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log('n8n response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('n8n error response:', errorText);
      throw new Error(`n8n webhook error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('n8n response data:', JSON.stringify(data).substring(0, 200));

    // Extract output from n8n response - handles both [{output: {...}}] and {output: {...}}
    let output;
    if (Array.isArray(data) && data[0]?.output) {
      output = data[0].output;
    } else if (data?.output) {
      output = data.output;
    } else {
      output = data;
    }
    
    // Validate response format (handles both French and English)
    if (!output?.status || (output.status !== 'success' && output.status !== 'succès')) {
      console.error('Invalid response format:', output);
      throw new Error('Invalid response format from n8n');
    }

    // Handle French field names from n8n
    const normalizedOutput = {
      status: 'success',
      food: output.aliments || output.food || [],
      total: output.total || {},
      analyse_nutritionnelle: output.analyse_nutritionnelle
    };

    // Map French field names to English for food items
    if (normalizedOutput.food && Array.isArray(normalizedOutput.food)) {
      normalizedOutput.food = normalizedOutput.food.map((item: any) => ({
        name: item.nom || item.name,
        quantity: item.quantité || item.quantity,
        calories: item.calories,
        protein: item.protéines || item.protein,
        carbs: item.glucides || item.carbs,
        fat: item.lipides || item.fat
      }));
    }

    // Map French field names to English for total
    if (normalizedOutput.total) {
      normalizedOutput.total = {
        calories: normalizedOutput.total.calories,
        protein: normalizedOutput.total.protéines || normalizedOutput.total.protein,
        carbs: normalizedOutput.total.glucides || normalizedOutput.total.carbs,
        fat: normalizedOutput.total.lipides || normalizedOutput.total.fat
      };
    }

    if (!normalizedOutput.food || !normalizedOutput.total) {
      console.error('Missing required fields in response:', output);
      throw new Error('Missing food or total data in response');
    }

    console.log('Analysis successful, returning data');

    return new Response(
      JSON.stringify(normalizedOutput),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    // Log full error details server-side
    console.error('Error in analyze-meal function:', error);
    
    // Return generic error message to client
    const userMessage = error instanceof Error && 
      (error.message.includes('Image') || error.message.includes('subscription') || error.message.includes('Trial') || error.message.includes('configuration'))
      ? error.message 
      : 'Unable to process meal analysis. Please try again.';
    
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
