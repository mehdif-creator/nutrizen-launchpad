import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

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

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  // Handle CORS preflight requests
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

    console.log('User authenticated:', user.id);

    // Check and consume credits BEFORE running analysis
    console.log('[analyze-fridge] Checking credits for user:', user.id)
    const { data: creditsCheck, error: creditsError } = await supabaseClient.rpc('check_and_consume_credits', {
      p_user_id: user.id,
      p_feature: 'inspifrigo',
      p_cost: 1
    })

    if (creditsError) {
      console.error('[analyze-fridge] Credits check error:', creditsError)
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la vérification des crédits' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!creditsCheck.success) {
      console.log('[analyze-fridge] Insufficient credits:', creditsCheck)
      return new Response(
        JSON.stringify({ 
          error_code: creditsCheck.error_code,
          error: creditsCheck.message || 'Crédits insuffisants',
          current_balance: creditsCheck.current_balance,
          required: creditsCheck.required
        }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[analyze-fridge] Credits consumed, proceeding with analysis')

    // Check subscription status (legacy check, kept for backwards compatibility)
    const { data: subscription, error: subError } = await supabaseClient
      .from('subscriptions')
      .select('status, trial_end')
      .eq('user_id', user.id)
      .maybeSingle();

    // Subscription check is now optional - credits are the primary gate
    if (subError) {
      console.warn('Subscription check warning:', subError);
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
    const webhookUrl = Deno.env.get('N8N_ANALYZE_FRIDGE_WEBHOOK');
    if (!webhookUrl) {
      console.error('N8N_ANALYZE_FRIDGE_WEBHOOK not configured');
      throw new Error('Webhook configuration missing');
    }

    // Forward to n8n webhook
    const n8nFormData = new FormData();
    n8nFormData.append('image', image);

    const response = await fetch(webhookUrl, {
      method: 'POST',
      body: n8nFormData,
      signal: AbortSignal.timeout(90000), // 90 second timeout
    });

    console.log('n8n response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('n8n error response:', errorText);
      throw new Error(`n8n webhook error: ${response.status}`);
    }

    const data = await response.json();
    console.log('n8n response received');

    // Extract output from response (handle both array and direct object)
    let output;
    if (Array.isArray(data) && data.length > 0 && data[0].output) {
      output = data[0].output;
    } else if (data.output) {
      output = data.output;
    } else {
      output = data;
    }

    if (!output || output.status !== 'succès') {
      console.error('Invalid response format:', data);
      throw new Error('Invalid response format from n8n');
    }

    console.log('Analysis successful, returning data');

    return new Response(
      JSON.stringify(output),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    // Log full error details server-side
    console.error('Error in analyze-fridge function:', error);
    
    // Return generic error message to client
    const userMessage = error instanceof Error && 
      (error.message.includes('Image') || error.message.includes('subscription') || error.message.includes('Trial') || error.message.includes('configuration'))
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
