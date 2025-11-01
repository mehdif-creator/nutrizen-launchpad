import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { getCorsHeaders } from '../_shared/security.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface CreateUserRequest {
  email: string;
  password?: string;
  full_name?: string;
  initial_credits?: number;
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
    const { email, password, full_name, initial_credits = 10 }: CreateUserRequest = await req.json();

    console.log(`[admin-create-user] Creating user: ${email}`);

    // Create auth user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: password || Math.random().toString(36).slice(-12),
      email_confirm: true,
      user_metadata: {
        full_name: full_name || '',
      }
    });

    if (createError) {
      throw new Error(`Failed to create user: ${createError.message}`);
    }

    console.log(`[admin-create-user] Auth user created: ${newUser.user.id}`);

    // Create profile
    await supabaseAdmin
      .from('profiles')
      .insert({
        id: newUser.user.id,
        email,
        full_name: full_name || null,
      });

    // Create trial subscription
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 30);

    await supabaseAdmin
      .from('subscriptions')
      .insert({
        user_id: newUser.user.id,
        status: 'trialing',
        plan: null,
        trial_start: new Date().toISOString(),
        trial_end: trialEnd.toISOString(),
      });

    // Initialize user data
    await supabaseAdmin
      .from('user_dashboard_stats')
      .insert({
        user_id: newUser.user.id,
        credits_zen: initial_credits,
        temps_gagne: 0,
        charge_mentale_pct: 0,
        objectif_hebdos_valide: 0,
        serie_en_cours_set_count: 0,
        references_count: 0,
      });

    await supabaseAdmin
      .from('user_gamification')
      .insert({
        user_id: newUser.user.id,
        points: 0,
        level: 1,
        streak_days: 0,
        badges_count: 0,
      });

    await supabaseAdmin
      .from('user_points')
      .insert({
        user_id: newUser.user.id,
        total_points: 0,
        current_level: 'Bronze',
        login_streak: 0,
        meals_generated: 0,
        meals_completed: 0,
        referrals: 0,
      });

    // Initialize swaps for current month
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    await supabaseAdmin
      .from('swaps')
      .insert({
        user_id: newUser.user.id,
        month: currentMonth.toISOString().split('T')[0],
        used: 0,
        quota: 10,
      });

    console.log(`[admin-create-user] User fully initialized: ${email}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `User ${email} created successfully`,
        user_id: newUser.user.id,
        email: newUser.user.email,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[admin-create-user] Error:', error);
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
