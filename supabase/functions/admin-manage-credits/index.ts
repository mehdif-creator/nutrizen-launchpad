import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { getCorsHeaders } from '../_shared/security.ts';
import { validate, AdminManageCreditsSchema } from '../_shared/validation.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify admin user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user is admin - filter for admin role specifically
    const { data: roles, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !roles) {
      throw new Error('Insufficient permissions');
    }

    // Validate and parse request body
    const body = await req.json();
    const { user_id, credits, operation } = validate(AdminManageCreditsSchema, body);

    console.log(`[admin-manage-credits] ${operation} ${credits} credits for user: ${user_id}`);

    // Get current credits
    const { data: currentStats, error: fetchError } = await supabaseAdmin
      .from('user_dashboard_stats')
      .select('credits_zen')
      .eq('user_id', user_id)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch user stats: ${fetchError.message}`);
    }

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
        throw new Error('Invalid operation');
    }

    // Update credits
    const { error: updateError } = await supabaseAdmin
      .from('user_dashboard_stats')
      .update({ credits_zen: newCredits })
      .eq('user_id', user_id);

    if (updateError) {
      throw new Error(`Failed to update credits: ${updateError.message}`);
    }

    console.log(`[admin-manage-credits] Credits updated: ${currentStats?.credits_zen || 0} -> ${newCredits}`);

    // Audit log
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
    console.error('[admin-manage-credits] Error:', error);
    
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
      console.error('[admin-manage-credits] Audit log failed:', auditError);
    }
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500,
      }
    );
  }
});
