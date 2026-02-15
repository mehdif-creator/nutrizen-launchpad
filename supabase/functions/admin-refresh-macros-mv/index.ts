/**
 * Admin Edge Function: Refresh Macros Materialized View
 * 
 * Securely refreshes the recipe_macros_mv2 materialized view.
 * Requires admin role.
 */

import { createClient } from '../_shared/deps.ts';
import { requireAdmin } from '../_shared/auth.ts';
import { getCorsHeaders, SecurityError } from '../_shared/security.ts';

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's token for auth check
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify JWT and get user
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;

    // Check admin role using the shared helper
    await requireAdmin(userClient, userId);

    // Use service role client to execute the refresh (needs elevated privileges)
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Execute the materialized view refresh
    const startTime = Date.now();
    
    const { error: refreshError } = await serviceClient.rpc('refresh_recipe_macros_mv2');

    if (refreshError) {
      // If RPC doesn't exist, try direct SQL via a dedicated function
      console.warn('RPC refresh_recipe_macros_mv2 not found, trying alternative...');
      
      // Fallback: try to call it differently or report error
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Refresh failed: ${refreshError.message}. Ensure refresh_recipe_macros_mv2() function exists.`
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const duration = Date.now() - startTime;

    console.log(`[admin-refresh-macros-mv] MV2 refreshed in ${duration}ms by admin ${userId}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Vue matérialisée actualisée en ${duration}ms`,
        duration_ms: duration,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const origin = req.headers.get('origin');
    const corsHeaders = getCorsHeaders(origin);
    
    console.error('[admin-refresh-macros-mv] Error:', error);

    if (error instanceof SecurityError) {
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: error.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const err = error as { statusCode?: number; message?: string };
    const status = err.statusCode || 500;
    const message = err.message || 'Internal server error';

    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
