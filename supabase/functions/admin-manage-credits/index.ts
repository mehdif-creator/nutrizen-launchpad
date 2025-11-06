import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { getCorsHeaders } from '../_shared/security.ts';
import { validate, AdminManageCreditsSchema } from '../_shared/validation.ts';
import { createLogger, redactId } from '../_shared/logging.ts';
import { sanitizeDbError, unauthorizedError, validationError, PublicError } from '../_shared/errors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  const logger = createLogger('admin-manage-credits');
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  logger.info('Request received', { method: req.method, origin });

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify admin user
    logger.step(1, 'Authenticating user');
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return unauthorizedError('No authorization header', corsHeaders);
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      logger.error('Authentication failed', { error: authError });
      return unauthorizedError('Invalid authentication', corsHeaders);
    }

    logger.step(2, 'User authenticated', { user_id: user.id });

    // Verify admin role using secure has_role function
    logger.step(3, 'Verifying admin role');
    const { data: isAdmin, error: roleError } = await supabaseAdmin
      .rpc('has_role', { _user_id: user.id, _role: 'admin' });

    if (roleError || !isAdmin) {
      logger.warn('Admin verification failed', { user_id: user.id, error: roleError });
      return unauthorizedError('Forbidden: admin role required', corsHeaders);
    }

    logger.step(4, 'Admin role verified');

    // Validate and parse request body
    const body = await req.json();
    const { user_id, credits, operation } = validate(AdminManageCreditsSchema, body);

    logger.info('Credit operation requested', {
      target_user_id: redactId(user_id),
      operation,
      amount: credits
    });

    // Get current credits
    logger.step(5, 'Fetching current credits');
    const { data: currentStats, error: fetchError } = await supabaseAdmin
      .from('user_dashboard_stats')
      .select('credits_zen')
      .eq('user_id', user_id)
      .maybeSingle();

    if (fetchError) {
      throw sanitizeDbError(fetchError, { operation: 'fetch_stats' });
    }

    // If user has no stats row, create one
    if (!currentStats) {
      logger.step(6, 'Creating initial stats record');
      const { error: insertError } = await supabaseAdmin
        .from('user_dashboard_stats')
        .insert({
          user_id: user_id,
          credits_zen: 0,
          temps_gagne: 0,
          charge_mentale_pct: 0,
          serie_en_cours_set_count: 0,
          references_count: 0,
          objectif_hebdos_valide: 0
        });

      if (insertError) {
        throw sanitizeDbError(insertError, { operation: 'create_stats' });
      }
    }

    // Calculate new credits based on operation
    logger.step(7, 'Calculating new credit amount');
    let newCredits: number;

    switch (operation) {
      case 'set':
        newCredits = credits;
        break;
      case 'add':
        newCredits = (currentStats?.credits_zen || 0) + credits;
        break;
      case 'subtract':
        newCredits = Math.max(0, (currentStats?.credits_zen || 0) - credits);
        break;
      default:
        return validationError('Invalid operation', corsHeaders);
    }

    logger.info('Credit calculation complete', {
      old_credits: currentStats?.credits_zen || 0,
      new_credits: newCredits,
      operation
    });

    // Use atomic RPC function for credit management
    logger.step(8, 'Applying credit change atomically');
    
    const { data: result, error: rpcError } = await supabaseAdmin
      .rpc('admin_set_user_credits', {
        p_user_id: user_id,
        p_credits: newCredits,
        p_admin_id: user.id
      });

    if (rpcError) {
      throw sanitizeDbError(rpcError, { 
        operation: 'set_credits', 
        new_credits: newCredits 
      });
    }

    logger.success('Credits updated atomically', {
      old_credits: result.old_credits,
      new_credits: result.new_credits
    });

    // Audit log
    logger.step(9, 'Writing audit log');
    await supabaseAdmin.from('admin_audit_log').insert({
      admin_id: user.id,
      action: 'manage_credits',
      target_user_id: user_id,
      request_body: { credits, operation, previous: currentStats?.credits_zen || 0, new: newCredits },
      ip_address: req.headers.get('x-forwarded-for'),
      user_agent: req.headers.get('user-agent'),
      success: true,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Credits ${operation}ed successfully`,
        user_id,
        previous_credits: currentStats?.credits_zen || 0,
        new_credits: newCredits,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    logger.error('Operation failed', { error });

    // Handle public errors
    if (error instanceof PublicError) {
      return error.toResponse(corsHeaders);
    }
    
    // Audit log failure
    try {
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const { data: { user } } = await supabaseAdmin.auth.getUser(token);
        
        if (user) {
          await supabaseAdmin.from('admin_audit_log').insert({
            admin_id: user.id,
            action: 'manage_credits',
            success: false,
            error_message: error instanceof Error ? error.message : 'Unknown error',
            ip_address: req.headers.get('x-forwarded-for'),
            user_agent: req.headers.get('user-agent'),
          });
        }
      }
    } catch (auditError) {
      logger.warn('Failed to log audit', { error: auditError });
    }
    
    // Generic error response
    return new PublicError({
      code: 'INTERNAL_ERROR',
      userMessage: 'An error occurred while processing your request. Please try again.',
      statusCode: 500,
      internalDetails: error
    }).toResponse(corsHeaders);
  }
});
