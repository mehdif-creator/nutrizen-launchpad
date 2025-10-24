import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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

    // Check subscription status
    const { data: subscription, error: subError } = await supabaseClient
      .from('subscriptions')
      .select('status, trial_end')
      .eq('user_id', user.id)
      .single();

    if (subError || !subscription) {
      console.error('Subscription check error:', subError);
      return new Response(
        JSON.stringify({ error: 'No active subscription found' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate subscription is active or trialing
    if (subscription.status !== 'active' && subscription.status !== 'trialing') {
      return new Response(
        JSON.stringify({ error: 'Active subscription required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if trial has expired
    if (subscription.status === 'trialing' && subscription.trial_end) {
      const trialEnd = new Date(subscription.trial_end);
      if (trialEnd < new Date()) {
        return new Response(
          JSON.stringify({ error: 'Trial expired' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log('Subscription validated for user:', user.id);
    const { image } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Extract base64 data
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');

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
            content: 'Tu es un expert en nutrition. Analyse les photos de plats et fournis des estimations précises des valeurs nutritionnelles. Réponds UNIQUEMENT en JSON avec les champs: calories (nombre), protein (nombre en g), carbs (nombre en g), fats (nombre en g), description (texte court).'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyse cette photo de plat et donne-moi ses valeurs nutritionnelles estimées.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Data}`
                }
              }
            ]
          }
        ],
        temperature: 0.3,
      }),
    });

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Parse JSON response
    const nutritionData = JSON.parse(content);

    return new Response(JSON.stringify(nutritionData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error analyzing photo:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      error: errorMessage,
      // Fallback response
      calories: 0,
      protein: 0,
      carbs: 0,
      fats: 0,
      description: 'Impossible d\'analyser l\'image pour le moment.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
