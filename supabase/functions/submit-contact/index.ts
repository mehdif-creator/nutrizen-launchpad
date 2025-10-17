import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, subject, message, timestamp } = await req.json();

    // Validate required fields
    if (!name || !email || !subject || !message) {
      throw new Error('Missing required fields');
    }

    // Forward to n8n webhook
    const n8nWebhookBase = Deno.env.get('N8N_WEBHOOK_BASE');
    if (!n8nWebhookBase) {
      throw new Error('N8N_WEBHOOK_BASE not configured');
    }

    const webhookUrl = `${n8nWebhookBase}/webhook/contact`;
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        email,
        subject,
        message,
        timestamp,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to submit contact form');
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error in submit-contact:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
