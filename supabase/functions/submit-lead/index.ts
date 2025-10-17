import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, source, timestamp } = await req.json();

    // Validate required fields
    if (!email || !source) {
      throw new Error('Missing required fields');
    }

    // Forward to n8n webhook
    const n8nWebhookBase = Deno.env.get('N8N_WEBHOOK_BASE');
    if (!n8nWebhookBase) {
      throw new Error('N8N_WEBHOOK_BASE not configured');
    }

    const webhookUrl = `${n8nWebhookBase}/webhook/leadmagnet.submit`;
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        source,
        timestamp,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to submit lead form');
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error in submit-lead:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
