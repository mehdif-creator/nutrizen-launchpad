import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Processing meal analysis request');
    
    // Get the form data from the request
    const formData = await req.formData();
    const image = formData.get('image');
    
    if (!image) {
      throw new Error('No image provided');
    }

    console.log('Image received, forwarding to n8n webhook...');

    const webhookUrl = 'https://n8n.srv1005117.hstgr.cloud/webhook-test/Nutrizen-analyse-repas';

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
    console.error('Error in analyze-meal function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        status: 'error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
