import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const ALLOWED_ORIGINS = [
  'https://mynutrizen.fr',
  'https://app.mynutrizen.fr',
  'https://www.mynutrizen.fr',
  'http://localhost:5173',
  'http://localhost:3000',
  'https://id-preview--a4e7364c-6c94-4f23-85c6-e6adea1804c7.lovable.app',
  'https://nutrizen-launchpad.lovable.app',
];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Valid job types
const JOB_TYPES = ['scan_repas', 'inspi_frigo', 'substitutions'] as const;

// Input schema
const StartJobSchema = z.object({
  type: z.enum(JOB_TYPES),
  payload: z.record(z.any()).default({}),
  idempotency_key: z.string().min(1).max(255),
});

// Map job types to n8n webhook env vars with fallback support
const WEBHOOK_ENV_MAP: Record<string, string[]> = {
  scan_repas: ['N8N_ANALYZE_MEAL_WEBHOOK', 'N8N_ANALYZE_MEAL_WEBHOOK_PROD', 'N8N_ANALYZE_MEAL_WEBHOOK_STAGING'],
  inspi_frigo: ['N8N_ANALYZE_FRIDGE_WEBHOOK', 'N8N_ANALYZE_FRIDGE_WEBHOOK_PROD', 'N8N_ANALYZE_FRIDGE_WEBHOOK_STAGING'],
  substitutions: ['N8N_SUBSTITUTIONS_WEBHOOK', 'N8N_SUBSTITUTIONS_WEBHOOK_PROD', 'N8N_SUBSTITUTIONS_WEBHOOK_STAGING'],
};

// Get webhook URL with fallback support
function getWebhookUrl(type: string): string | null {
  const envVars = WEBHOOK_ENV_MAP[type];
  if (!envVars) return null;
  
  for (const envVar of envVars) {
    const url = Deno.env.get(envVar);
    if (url) {
      console.log(`[start-job] Using webhook env var: ${envVar} (exists: true)`);
      return url;
    }
  }
  
  console.log(`[start-job] No webhook configured for type=${type}, checked: ${envVars.join(', ')}`);
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Non authentifié', error_code: 'UNAUTHORIZED' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      console.error('[start-job] Auth error:', authError);
      return new Response(
        JSON.stringify({ success: false, error: 'Non authentifié', error_code: 'UNAUTHORIZED' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse and validate input
    const body = await req.json();
    const validated = StartJobSchema.parse(body);
    const { type, payload, idempotency_key } = validated;

    console.log(`[start-job] User ${user.id} starting job type=${type} key=${idempotency_key}`);

    // 1. Check/debit credits atomically
    const { data: debitResult, error: debitError } = await supabaseAdmin.rpc('rpc_debit_credits_for_job', {
      p_user_id: user.id,
      p_feature: type,
      p_idempotency_key: idempotency_key,
    });

    if (debitError) {
      console.error('[start-job] Debit RPC error:', debitError);
      return new Response(
        JSON.stringify({ success: false, error: 'Erreur système', error_code: 'SYSTEM_ERROR' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const debit = debitResult as { success: boolean; error_code?: string; message?: string; current_balance?: number; required?: number };

    if (!debit.success) {
      console.log('[start-job] Insufficient credits:', debit);
      return new Response(
        JSON.stringify({
          success: false,
          error: debit.message || 'Crédits insuffisants',
          error_code: debit.error_code || 'INSUFFICIENT_CREDITS',
          current_balance: debit.current_balance,
          required: debit.required,
        }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Create or reuse job (idempotent upsert)
    const { data: jobData, error: jobError } = await supabaseClient
      .from('automation_jobs')
      .upsert({
        user_id: user.id,
        type,
        payload,
        idempotency_key,
        status: 'queued',
      }, {
        onConflict: 'user_id,idempotency_key',
      })
      .select('id, status')
      .single();

    if (jobError) {
      console.error('[start-job] Job upsert error:', jobError);
      // Refund credits since job failed to create
      await supabaseAdmin.rpc('rpc_refund_credits_for_job', {
        p_user_id: user.id,
        p_feature: type,
        p_original_idempotency_key: idempotency_key,
      });
      return new Response(
        JSON.stringify({ success: false, error: 'Erreur création tâche', error_code: 'JOB_CREATE_ERROR' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const jobId = jobData.id;

    // If job already completed, return its result
    if (jobData.status === 'success' || jobData.status === 'error') {
      const { data: existingJob } = await supabaseClient
        .from('automation_jobs')
        .select('*')
        .eq('id', jobId)
        .single();
      
      return new Response(
        JSON.stringify({
          success: true,
          job_id: jobId,
          status: existingJob?.status,
          result: existingJob?.result,
          error: existingJob?.error,
          message_fr: existingJob?.status === 'success' ? 'Résultat disponible.' : 'Tâche terminée avec erreur.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Call n8n webhook (server-side)
    const webhookUrl = getWebhookUrl(type);
    
    // Get callback URL
    const callbackUrl = `${supabaseUrl}/functions/v1/job-callback`;

    // Provide specific French error messages per type
    const webhookErrorMessages: Record<string, string> = {
      scan_repas: 'Configuration manquante : webhook ScanRepas.',
      inspi_frigo: 'Configuration manquante : webhook InspiFrigo.',
      substitutions: 'Configuration manquante : webhook substitutions.',
    };

    if (!webhookUrl) {
      const errorMessage = webhookErrorMessages[type] || 'Configuration webhook manquante.';
      console.error(`[start-job] Webhook not configured for type=${type}`);
      
      // Mark job as error and refund
      await supabaseAdmin
        .from('automation_jobs')
        .update({ status: 'error', error: errorMessage })
        .eq('id', jobId);
      
      await supabaseAdmin.rpc('rpc_refund_credits_for_job', {
        p_user_id: user.id,
        p_feature: type,
        p_original_idempotency_key: idempotency_key,
      });

      return new Response(
        JSON.stringify({ 
          success: false, 
          job_id: jobId,
          error: errorMessage, 
          error_code: 'WEBHOOK_NOT_CONFIGURED',
          message_fr: errorMessage,
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    try {
      const webhookPayload = {
        job_id: jobId,
        user_id: user.id,
        type,
        payload,
        callback_url: callbackUrl,
        idempotency_key,
      };

      console.log(`[start-job] Calling n8n webhook for job ${jobId}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout for webhook call

      const webhookResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!webhookResponse.ok) {
        throw new Error(`Webhook returned ${webhookResponse.status}`);
      }

      // Update job to running
      await supabaseAdmin
        .from('automation_jobs')
        .update({ status: 'running' })
        .eq('id', jobId);

      console.log(`[start-job] Job ${jobId} now running`);

      return new Response(
        JSON.stringify({
          success: true,
          job_id: jobId,
          status: 'running',
          message_fr: 'Votre demande est en cours de traitement.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (webhookError) {
      console.error('[start-job] Webhook call failed:', webhookError);
      
      // Mark job as error and refund
      await supabaseAdmin
        .from('automation_jobs')
        .update({ status: 'error', error: 'Échec de communication avec le service' })
        .eq('id', jobId);
      
      await supabaseAdmin.rpc('rpc_refund_credits_for_job', {
        p_user_id: user.id,
        p_feature: type,
        p_original_idempotency_key: idempotency_key,
      });

      return new Response(
        JSON.stringify({
          success: false,
          job_id: jobId,
          error: 'Service temporairement indisponible. Réessayez plus tard.',
          error_code: 'WEBHOOK_FAILED',
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('[start-job] Unhandled error:', error);
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Données invalides',
          error_code: 'VALIDATION_ERROR',
          details: error.errors,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ success: false, error: 'Erreur interne', error_code: 'INTERNAL_ERROR' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
