import { createClient } from '../_shared/deps.ts';
import { z } from 'npm:zod@3.22.4';
import { checkRateLimit, rateLimitExceededResponse } from '../_shared/rateLimit.ts';
import { getCorsHeaders } from '../_shared/security.ts';

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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

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

    // ── Pre-check balance (read-only) — actual deduction AFTER successful API call ──
    const { data: walletPreCheck } = await supabaseAdmin
      .from('user_wallets')
      .select('subscription_credits, lifetime_credits')
      .eq('user_id', user.id)
      .maybeSingle();
    const preCheckBalance = (walletPreCheck?.subscription_credits ?? 0) + (walletPreCheck?.lifetime_credits ?? 0);

    if (preCheckBalance < 1) {
      console.log('[analyze-meal] Insufficient credits:', preCheckBalance);
      return new Response(
        JSON.stringify({ 
          error_code: 'INSUFFICIENT_CREDITS',
          error: 'Crédits insuffisants',
          current_balance: preCheckBalance,
          required: 1,
          status: 'error'
        }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
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
      // NO credit deduction on config error
      throw new Error('Webhook configuration missing');
    }

    // Forward to n8n webhook with 90 second timeout
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
      // NO credit deduction on API failure
      return new Response(
        JSON.stringify({ error: `Service d'analyse indisponible. Aucun crédit débité.`, status: 'error' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
      // NO credit deduction on invalid response
      return new Response(
        JSON.stringify({ error: 'Réponse invalide du service. Aucun crédit débité.', status: 'error' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
      // NO credit deduction on incomplete response
      return new Response(
        JSON.stringify({ error: 'Données manquantes dans la réponse. Aucun crédit débité.', status: 'error' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── SUCCESS: Now deduct credits atomically ──
    console.log('[analyze-meal] Deducting 1 credit after successful analysis');
    const { data: creditsCheck, error: creditsError } = await supabaseClient.rpc('check_and_consume_credits', {
      p_user_id: user.id,
      p_feature: 'scanrepas',
      p_cost: 1
    });

    if (creditsError) {
      console.error('[analyze-meal] Credits deduction error after success:', creditsError);
      // Still return the result
    }

    console.log('[analyze-meal] Analysis successful, credits deducted, returning data');

    return new Response(
      JSON.stringify(normalizedOutput),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    // Log full error details server-side
    console.error('Error in analyze-meal function:', error);
    
    // NO credits deducted on unhandled errors
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