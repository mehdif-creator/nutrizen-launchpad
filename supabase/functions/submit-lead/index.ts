import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { getCorsHeaders, getClientIp } from "../_shared/security.ts";

const leadSchema = z.object({
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  source: z.string().trim().min(1, "Source is required").max(100, "Source must be less than 100 characters"),
  timestamp: z.string().optional()
});

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    // DB-backed rate limiting via shared RPC
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const clientIp = getClientIp(req);
    const identifier = `ip:${clientIp}`;

    const { data: rlResult, error: rlError } = await supabaseAdmin.rpc('check_rate_limit', {
      p_identifier: identifier,
      p_endpoint: 'submit-lead',
      p_max_tokens: 5,
      p_refill_rate: 5, // 5 per minute ≈ 5 per hour with cost 60
      p_cost: 60,
    });

    if (!rlError && rlResult && !rlResult.allowed) {
      return new Response(JSON.stringify({ error: 'rate_limited' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 429,
      });
    }

    const body = await req.json();

    // Validate and sanitize input
    const validatedData = leadSchema.parse(body);
    const { email, source, timestamp } = validatedData;

    // Forward to n8n webhook
    const n8nWebhookBase = Deno.env.get('N8N_WEBHOOK_BASE');
    if (!n8nWebhookBase) {
      console.error('N8N_WEBHOOK_BASE not configured');
      throw new Error('Webhook configuration error');
    }

    const webhookUrl = `${n8nWebhookBase}/webhook/submit-lead`;
    
    console.log('Forwarding lead to n8n:', { email, source, webhookUrl });
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        source,
        timestamp: timestamp || new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      console.error('n8n webhook failed:', response.status, response.statusText);
      throw new Error('Failed to submit lead form');
    }

    console.log('Lead successfully submitted to n8n');

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error in submit-lead:', error);
    
    const userMessage = error instanceof z.ZodError 
      ? error.errors[0]?.message || 'Invalid form data'
      : 'Unable to submit form. Please try again.';
    
    return new Response(JSON.stringify({ error: userMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: error instanceof z.ZodError ? 400 : 500,
    });
  }
});
