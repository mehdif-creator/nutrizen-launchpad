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

    // Use atomic RPC function for credit management
    // The RPC handles all credit calculations and updates both tables atomically
    logger.step(5, 'Applying credit change atomically', {
      operation,
      credits
    });
    
    const { data: result, error: rpcError } = await supabaseAdmin
      .rpc('admin_set_user_credits', {
        p_user_id: user_id,
        p_credits: credits,
        p_operation: operation
      });

    if (rpcError) {
      throw sanitizeDbError(rpcError, { 
        operation: 'atomic_credit_update',
        credits,
        operation_type: operation
      });
    }

    if (!result?.success) {
      throw new PublicError({
        code: 'INTERNAL_ERROR',
        userMessage: 'Failed to update credits',
        statusCode: 500,
        internalDetails: result
      });
    }

    logger.success('Credits updated atomically', {
      operation,
      previous_credits: result.previous_credits,
      new_credits: result.new_credits,
      remaining: result.remaining
    });

    const newCredits = result.new_credits;
    const previousCredits = result.previous_credits;

    // Audit log
    logger.step(6, 'Writing audit log');
    await supabaseAdmin.from('admin_audit_log').insert({
      admin_id: user.id,
      action: 'manage_credits',
      target_user_id: user_id,
      request_body: { credits, operation, previous: previousCredits, new: newCredits },
      ip_address: req.headers.get('x-forwarded-for'),
      user_agent: req.headers.get('user-agent'),
      success: true,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Credits ${operation}ed successfully`,
        user_id,
        previous_credits: previousCredits,
        new_credits: newCredits,
        remaining: result.remaining
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
