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

    // Forward to n8n webhook
    const n8nFormData = new FormData();
    n8nFormData.append('image', image);

    const response = await fetch(webhookUrl, {
      method: 'POST',
      body: n8nFormData,
    });

    console.log('n8n response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('n8n error response:', errorText);
      throw new Error(`n8n webhook error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('n8n response data:', JSON.stringify(data).substring(0, 200));

    // Validate response format
    if (!data?.status || data.status !== 'success') {
      console.error('Invalid response format:', data);
      throw new Error('Invalid response format from n8n');
    }

    if (!data.food || !data.total) {
      console.error('Missing required fields in response:', data);
      throw new Error('Missing food or total data in response');
    }

    console.log('Analysis successful, returning data');

    return new Response(
      JSON.stringify(data),
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
