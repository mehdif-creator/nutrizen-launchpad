import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// HMAC signature validation
async function generateHmac(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function validateHmacSignature(
  data: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const expectedSignature = await generateHmac(data, secret);
  return signature === expectedSignature;
}

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
    // Rate limiting
    const identifier = req.headers.get('CF-Connecting-IP') || req.headers.get('X-Forwarded-For') || 'anonymous';
    if (!checkRateLimit(identifier)) {
      return new Response(JSON.stringify({ error: 'Too many requests. Please try again later.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 429,
      });
    }

    const body = await req.json();

    // HMAC signature validation - REQUIRED for security
    const signature = req.headers.get('x-signature');
    const hmacSecret = Deno.env.get('HMAC_SECRET');
    
    if (!signature || !hmacSecret) {
      console.warn('Missing HMAC signature or secret');
      return new Response(JSON.stringify({ error: 'Invalid request' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    const isValid = await validateHmacSignature(JSON.stringify(body), signature, hmacSecret);
    if (!isValid) {
      console.warn('Invalid HMAC signature detected');
      return new Response(JSON.stringify({ error: 'Invalid request signature' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

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
