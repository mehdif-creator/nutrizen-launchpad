import { createClient } from '../_shared/deps.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { createHmac } from "node:crypto";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-n8n-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Callback payload schema
const CallbackSchema = z.object({
  job_id: z.string().uuid(),
  status: z.enum(['success', 'error']),
  result: z.record(z.any()).optional(),
  error: z.string().optional(),
  idempotency_key: z.string(),
});

// Verify HMAC signature from n8n
function verifySignature(payload: string, signature: string | null, secret: string): boolean {
  if (!signature || !secret) {
    console.warn('[job-callback] No signature or secret configured');
    return !secret; // If no secret configured, skip validation
  }
  
  try {
    const hmac = createHmac('sha256', secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');
    return signature === expectedSignature || signature === `sha256=${expectedSignature}`;
  } catch (e) {
    console.error('[job-callback] Signature verification error:', e);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const hmacSecret = Deno.env.get('HMAC_SECRET') || '';

  try {
    // Read raw body for signature verification
    const rawBody = await req.text();
    
    // Verify signature
    const signature = req.headers.get('x-n8n-signature');
    if (hmacSecret && !verifySignature(rawBody, signature, hmacSecret)) {
      console.error('[job-callback] Invalid signature');
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse body
    const body = JSON.parse(rawBody);
    const validated = CallbackSchema.parse(body);
    const { job_id, status, result, error, idempotency_key } = validated;

    console.log(`[job-callback] Received callback for job ${job_id}, status=${status}`);

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch job to validate
    const { data: job, error: fetchError } = await supabaseAdmin
      .from('automation_jobs')
      .select('id, user_id, type, idempotency_key, status')
      .eq('id', job_id)
      .single();

    if (fetchError || !job) {
      console.error('[job-callback] Job not found:', job_id);
      return new Response(
        JSON.stringify({ success: false, error: 'Job not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate idempotency key matches
    if (job.idempotency_key !== idempotency_key) {
      console.error('[job-callback] Idempotency key mismatch');
      return new Response(
        JSON.stringify({ success: false, error: 'Idempotency key mismatch' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Don't update if already finalized
    if (job.status === 'success' || job.status === 'error' || job.status === 'canceled') {
      console.log(`[job-callback] Job ${job_id} already finalized with status=${job.status}`);
      return new Response(
        JSON.stringify({ success: true, message: 'Job already finalized' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update job status
    const updateData: Record<string, any> = { status };
    if (status === 'success' && result) {
      updateData.result = result;
    }
    if (status === 'error' && error) {
      updateData.error = error;
    }

    const { error: updateError } = await supabaseAdmin
      .from('automation_jobs')
      .update(updateData)
      .eq('id', job_id);

    if (updateError) {
      console.error('[job-callback] Update error:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Update failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[job-callback] Job ${job_id} updated to status=${status}`);

    // If error, optionally refund credits (configurable policy)
    // Currently NOT auto-refunding on error - this is a business decision
    // Uncomment below to enable auto-refund on error:
    /*
    if (status === 'error') {
      await supabaseAdmin.rpc('rpc_refund_credits_for_job', {
        p_user_id: job.user_id,
        p_feature: job.type,
        p_original_idempotency_key: job.idempotency_key,
      });
    }
    */

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[job-callback] Unhandled error:', error);
    
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid payload', details: error.errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ success: false, error: 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
