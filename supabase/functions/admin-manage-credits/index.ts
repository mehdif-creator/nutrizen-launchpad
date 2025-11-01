import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { getCorsHeaders } from '../_shared/security.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface ManageCreditsRequest {
  user_id: string;
  credits: number;
  operation: 'set' | 'add' | 'subtract';
}

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

    // Check if user is admin
    const { data: roles, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || roles?.role !== 'admin') {
      throw new Error('Insufficient permissions');
    }

    // Get request body
    const { user_id, credits, operation }: ManageCreditsRequest = await req.json();

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
