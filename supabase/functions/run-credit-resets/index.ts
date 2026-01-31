import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Edge Function: run-credit-resets
 * 
 * Called by cron job (every hour) or manually to process credit resets.
 * Processes users where next_reset_at <= now() in batches.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse optional parameters
    const body = await req.json().catch(() => ({}));
    const batchSize = body.batch_size || 200;
    const dryRun = body.dry_run || false;

    console.log(`[run-credit-resets] Starting batch processing. Batch size: ${batchSize}, Dry run: ${dryRun}`);

    // Find users due for reset
    // Conditions: 
    // 1. reset_cadence != 'none'
    // 2. next_reset_at <= now() OR last_reset_at IS NULL
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
      return new Response(
        JSON.stringify({ 
          success: true, 
          processed: 0, 
          message: 'No users due for reset' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[run-credit-resets] Found ${usersToReset.length} users due for reset`);

    let processedCount = 0;
    let errorCount = 0;
    const errors: { userId: string; error: string }[] = [];

    // Process each user
    for (const user of usersToReset) {
      try {
        if (dryRun) {
          console.log(`[run-credit-resets] DRY RUN: Would reset user ${user.user_id.substring(0, 8)}...`);
          processedCount++;
          continue;
        }

        // Call the RPC to apply reset
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
        }
      } catch (userError: any) {
        console.error(`[run-credit-resets] Exception for user ${user.user_id.substring(0, 8)}:`, userError);
        errorCount++;
        errors.push({ userId: user.user_id.substring(0, 8), error: userError.message });
      }
    }

    console.log(`[run-credit-resets] Completed. Processed: ${processedCount}, Errors: ${errorCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: processedCount,
        errors: errorCount,
        total_checked: usersToReset.length,
        error_details: errors.length > 0 ? errors : undefined,
        dry_run: dryRun,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[run-credit-resets] Fatal error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
