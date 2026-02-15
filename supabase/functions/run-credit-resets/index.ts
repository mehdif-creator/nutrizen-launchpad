import { createClient } from '../_shared/deps.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Edge Function: run-credit-resets
 * 
 * Called by cron job (every hour) or manually to process credit resets.
 * Processes users where next_reset_at <= now() in batches.
 * 
 * Features:
 * - Idempotent: uses credit_resets_log to prevent double grants
 * - Logs each run to credit_reset_runs table
 * - Timezone-aware: uses Europe/Paris for period boundaries
 * - Batch processing: handles up to 200 users per run
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Authenticate: only service role or cron secret allowed
  const authHeader = req.headers.get('Authorization');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const cronSecret = Deno.env.get('CRON_SECRET');
  const token = authHeader?.replace('Bearer ', '');

  if (token !== serviceRoleKey && (!cronSecret || token !== cronSecret)) {
    console.warn('[run-credit-resets] Unauthorized call attempt');
    return new Response(
      JSON.stringify({ success: false, error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const runId = crypto.randomUUID();
  let supabase: any;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    supabase = createClient(supabaseUrl, serviceRoleKey);

    // Parse optional parameters
    const body = await req.json().catch(() => ({}));
    const batchSize = body.batch_size || 200;
    const dryRun = body.dry_run || false;
    const trigger = body.trigger || 'cron_hourly';

    console.log(`[run-credit-resets] Run ${runId.substring(0, 8)}: Starting. Batch: ${batchSize}, DryRun: ${dryRun}, Trigger: ${trigger}`);

    // Create run log entry
    const { data: runLog, error: logError } = await supabase
      .from('credit_reset_runs')
      .insert({
        id: runId,
        trigger,
        status: 'running',
        summary: { batch_size: batchSize, dry_run: dryRun },
      })
      .select()
      .single();

    if (logError) {
      console.error('[run-credit-resets] Error creating run log:', logError);
      // Continue anyway - logging failure shouldn't block the reset
    }

    // Find users due for reset
    // Conditions: 
    // 1. reset_cadence != 'none'
    // 2. next_reset_at <= now() OR last_reset_at IS NULL
    // 3. allowance_amount > 0
    const { data: usersToReset, error: fetchError } = await supabase
      .from('user_wallets')
      .select('user_id, reset_cadence, last_reset_at, next_reset_at, allowance_amount')
      .neq('reset_cadence', 'none')
      .gt('allowance_amount', 0)
      .or(`next_reset_at.lte.${new Date().toISOString()},last_reset_at.is.null`)
      .limit(batchSize);

    if (fetchError) {
      console.error('[run-credit-resets] Error fetching users:', fetchError);
      throw new Error(`Failed to fetch users: ${fetchError.message}`);
    }

    if (!usersToReset || usersToReset.length === 0) {
      console.log('[run-credit-resets] No users due for credit reset');
      
      // Update run log
      await supabase
        .from('credit_reset_runs')
        .update({
          finished_at: new Date().toISOString(),
          status: 'success',
          summary: { 
            users_scanned: 0, 
            users_reset: 0, 
            credits_added: 0, 
            errors: 0,
            message: 'No users due for reset'
          },
        })
        .eq('id', runId);

      return new Response(
        JSON.stringify({ 
          success: true, 
          run_id: runId,
          processed: 0, 
          message: 'No users due for reset' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[run-credit-resets] Found ${usersToReset.length} users due for reset`);

    let processedCount = 0;
    let creditsAdded = 0;
    let errorCount = 0;
    const errors: { userId: string; error: string }[] = [];

    // Process each user
    for (const user of usersToReset) {
      try {
        if (dryRun) {
          console.log(`[run-credit-resets] DRY RUN: Would reset user ${user.user_id.substring(0, 8)}...`);
          processedCount++;
          creditsAdded += user.allowance_amount || 0;
          continue;
        }

        // Call the RPC to apply reset atomically
        const { data: resetResult, error: resetError } = await supabase
          .rpc('rpc_apply_credit_reset', { p_user_id: user.user_id });

        if (resetError) {
          console.error(`[run-credit-resets] Error resetting user ${user.user_id.substring(0, 8)}:`, resetError);
          errorCount++;
          errors.push({ userId: user.user_id.substring(0, 8), error: resetError.message });
          continue;
        }

        const action = resetResult?.action || 'unknown';
        console.log(`[run-credit-resets] User ${user.user_id.substring(0, 8)}: ${action}`);
        
        if (action === 'reset_applied') {
          processedCount++;
          creditsAdded += resetResult.granted_amount || user.allowance_amount || 0;
        } else if (action === 'already_reset') {
          // Idempotency check passed - already reset this period
          console.log(`[run-credit-resets] User ${user.user_id.substring(0, 8)}: Already reset for this period`);
        }
      } catch (userError: any) {
        console.error(`[run-credit-resets] Exception for user ${user.user_id.substring(0, 8)}:`, userError);
        errorCount++;
        errors.push({ userId: user.user_id.substring(0, 8), error: userError.message });
      }
    }

    console.log(`[run-credit-resets] Completed. Processed: ${processedCount}, Credits: ${creditsAdded}, Errors: ${errorCount}`);

    // Update run log with results
    const summary = {
      users_scanned: usersToReset.length,
      users_reset: processedCount,
      credits_added: creditsAdded,
      errors: errorCount,
      error_details: errors.length > 0 ? errors.slice(0, 10) : undefined, // Keep first 10 errors
      dry_run: dryRun,
    };

    await supabase
      .from('credit_reset_runs')
      .update({
        finished_at: new Date().toISOString(),
        status: errorCount > 0 && processedCount === 0 ? 'error' : 'success',
        summary,
        error: errorCount > 0 ? `${errorCount} user(s) failed` : null,
      })
      .eq('id', runId);

    return new Response(
      JSON.stringify({
        success: true,
        run_id: runId,
        processed: processedCount,
        credits_added: creditsAdded,
        errors: errorCount,
        total_checked: usersToReset.length,
        dry_run: dryRun,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[run-credit-resets] Fatal error:', error);
    
    // Try to update run log with error
    if (supabase) {
      await supabase
        .from('credit_reset_runs')
        .update({
          finished_at: new Date().toISOString(),
          status: 'error',
          error: error.message,
        })
        .eq('id', runId)
        .catch(() => {}); // Ignore logging errors
    }

    return new Response(
      JSON.stringify({ 
        success: false,
        run_id: runId,
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
