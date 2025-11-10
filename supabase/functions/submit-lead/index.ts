import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// SECURITY: Strict CORS allow-list
const ALLOWED_ORIGINS = [
  'https://mynutrizen.fr',
  'https://app.mynutrizen.fr',
  'http://localhost:5173',
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  const isAllowed = origin && ALLOWED_ORIGINS.includes(origin);
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

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
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    // Rate limiting based on IP
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
    // Log full error details server-side
    console.error('Error in submit-lead:', error);
    
    // Return generic error message to client
    const userMessage = error instanceof z.ZodError 
      ? error.errors[0]?.message || 'Invalid form data'
      : 'Unable to submit form. Please try again.';
    
    return new Response(JSON.stringify({ error: userMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: error instanceof z.ZodError ? 400 : 500,
    });
  }
});
