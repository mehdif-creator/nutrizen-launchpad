import { createClient } from '../_shared/deps.ts';
import { getCorsHeaders } from '../_shared/security.ts';
import { validate, AdminCreateUserSchema } from '../_shared/validation.ts';

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

    // Check if user is admin using secure has_role() RPC
    const { data: isAdmin, error: roleError } = await supabaseAdmin
      .rpc('has_role', { _user_id: user.id, _role: 'admin' });

    if (roleError || !isAdmin) {
      throw new Error('Insufficient permissions');
    }

    // Validate and parse request body
    const body = await req.json();
    const { email, password, full_name, initial_credits } = validate(AdminCreateUserSchema, body);

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
      console.error('[admin-create-user] Auth creation error:', createError.message);
      throw new Error('Failed to create user');
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
            action: 'create_user',
            success: false,
            error_message: error instanceof Error ? error.message : 'Unknown error',
            ip_address: req.headers.get('x-forwarded-for'),
            user_agent: req.headers.get('user-agent'),
          });
        }
      }
    } catch (auditError) {
      console.error('[admin-create-user] Audit log failed:', auditError);
    }
    
    const isAuthError = error instanceof Error && 
      (error.message === 'Unauthorized' || error.message === 'No authorization header');
    
    return new Response(
      JSON.stringify({
        success: false,
        error: isAuthError ? 'Unauthorized' : 'An error occurred. Please try again.',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: isAuthError ? 401 : 500,
      }
    );
  }
});
