import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple in-memory rate limiting
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 5; // 5 submissions per hour

const leadSchema = z.object({
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  source: z.string().trim().min(1, "Source is required").max(100, "Source must be less than 100 characters"),
  timestamp: z.string().optional()
});

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }

  record.count++;
  return true;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limiting
    const identifier = req.headers.get('CF-Connecting-IP') || req.headers.get('X-Forwarded-For') || 'anonymous';
    if (!checkRateLimit(identifier)) {
      return new Response(JSON.stringify({ error: 'Too many requests. Please try again later.' }), {
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
