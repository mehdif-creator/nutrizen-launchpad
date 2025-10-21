import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    const { event, ...eventData } = body

    // Validate event type - only allow specific events
    const allowedEvents = [
      'meal_completed',
      'meal_generated',
      'login_streak',
      'referral_made',
      'referral_completed',
      'subscription_created',
      'subscription_updated',
      'swap_used',
    ]
    
    if (!allowedEvents.includes(event)) {
      console.error(`Invalid event type attempted: ${event}`)
      return new Response(
        JSON.stringify({ error: 'Invalid event type' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Ensure user can only emit events for themselves
    if (eventData.user_id && eventData.user_id !== user.id) {
      console.error(`User ${user.id} attempted to emit event for ${eventData.user_id}`)
      return new Response(
        JSON.stringify({ error: 'Cannot emit events for other users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const HMAC_SECRET = Deno.env.get('HMAC_SECRET')
    const N8N_WEBHOOK_BASE = Deno.env.get('N8N_WEBHOOK_BASE')

    if (!HMAC_SECRET || !N8N_WEBHOOK_BASE) {
      console.error('Missing required environment variables')
      return new Response(
        JSON.stringify({ error: 'Configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const payload = {
      event,
      ...eventData,
      user_id: user.id,
      ts: Date.now(),
      idempotency_key: crypto.randomUUID(),
    }

    // Sign payload with HMAC on server-side
    const encoder = new TextEncoder()
    const keyData = encoder.encode(HMAC_SECRET)
    const messageData = encoder.encode(JSON.stringify(payload))

    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )

    const signature = await crypto.subtle.sign('HMAC', key, messageData)
    const signatureHex = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    // Emit to n8n
    try {
      await fetch(`${N8N_WEBHOOK_BASE}/${event}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Event-Name': event,
          'X-Signature': `sha256=${signatureHex}`,
          'X-Timestamp': payload.ts.toString(),
        },
        body: JSON.stringify(payload),
      })

      console.log(`Webhook emitted successfully: ${event}`)
    } catch (error) {
      console.error('Failed to emit webhook:', error)
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in emit-webhook:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
