/**
 * start-job: Authenticated job launcher
 * 
 * Security: Auth required, strict CORS, Zod validation, credit debit
 */
import { createClient } from '../_shared/deps.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { getCorsHeaders } from '../_shared/security.ts';

// Valid job types
const JOB_TYPES = ['scan_repas', 'inspi_frigo', 'substitutions'] as const;

// Input schema
const StartJobSchema = z.object({
  type: z.enum(JOB_TYPES),
  payload: z.record(z.unknown()).default({}),
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

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

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
    const callbackUrl = `${supabaseUrl}/functions/v1/job-callback`;

    const webhookErrorMessages: Record<string, string> = {
      scan_repas: 'Configuration manquante : webhook ScanRepas.',
      inspi_frigo: 'Configuration manquante : webhook InspiFrigo.',
      substitutions: 'Configuration manquante : webhook substitutions.',
    };

    if (!webhookUrl) {
      const errorMessage = webhookErrorMessages[type] || 'Configuration webhook manquante.';
      console.error(`[start-job] Webhook not configured for type=${type}`);
      
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
      const timeoutId = setTimeout(() => controller.abort(), 30000);

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
