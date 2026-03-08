import { createClient } from '../_shared/deps.ts';
import { getCorsHeaders } from '../_shared/security.ts';

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Use the unified V2 gamification function (handles idempotency, streak, sync)
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' });
    
    const { data, error } = await supabaseClient.rpc('fn_emit_gamification_event', {
      p_event_type: 'APP_OPEN',
      p_meta: { source: 'edge_function' },
      p_idempotency_key: `app_open:${user.id}:${today}`,
    });

    if (error) throw error;

    const result = data as { success: boolean; error?: string; duplicate?: boolean; points_awarded?: number };

    if (!result.success) {
      const alreadyAwarded = result.duplicate || result.error === 'already_processed' || result.error === 'daily_limit_reached';
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: alreadyAwarded ? 'Already awarded today' : (result.error || 'Unknown error'),
          alreadyAwarded,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        points: result.points_awarded || 2,
        message: `+${result.points_awarded || 2} points pour l'ouverture de l'app !`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Award app open error:', error);
    
    const message = (error as Error).message;
    const isAuthError = message.includes('Unauthorized') || message.includes('JWT');
    
    return new Response(
      JSON.stringify({ 
        error: isAuthError ? 'Authentication required' : 'Failed to award app open points'
      }),
      { 
        status: isAuthError ? 401 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
