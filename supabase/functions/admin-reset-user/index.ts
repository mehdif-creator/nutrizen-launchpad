import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface ResetUserRequest {
  email: string;
  extendTrialDays?: number;
}

Deno.serve(async (req) => {
  // Handle CORS
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
    const { email, extendTrialDays = 30 }: ResetUserRequest = await req.json();

    console.log(`[admin-reset-user] Resetting user: ${email}`);

    // Get user by email
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (profileError || !profile) {
      throw new Error(`User not found: ${email}`);
    }

    const userId = profile.id;
    console.log(`[admin-reset-user] Found user ID: ${userId}`);

    // Reset swaps for current month
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    await supabaseAdmin
      .from('swaps')
      .upsert({
        user_id: userId,
        month: currentMonth.toISOString().split('T')[0],
        used: 0,
        quota: 10,
      }, {
        onConflict: 'user_id,month'
      });

    // Reset user_gamification
    await supabaseAdmin
      .from('user_gamification')
      .upsert({
        user_id: userId,
        points: 0,
        level: 1,
        streak_days: 0,
        badges_count: 0,
        last_activity_date: null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      });

    // Reset user_dashboard_stats
    await supabaseAdmin
      .from('user_dashboard_stats')
      .upsert({
        user_id: userId,
        credits_zen: 10,
        temps_gagne: 0,
        charge_mentale_pct: 0,
        objectif_hebdos_valide: 0,
        serie_en_cours_set_count: 0,
        references_count: 0,
      }, {
        onConflict: 'user_id'
      });

    // Reset user_points
    await supabaseAdmin
      .from('user_points')
      .upsert({
        user_id: userId,
        total_points: 0,
        current_level: 'Bronze',
        login_streak: 0,
        meals_generated: 0,
        meals_completed: 0,
        referrals: 0,
        last_login_date: null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      });

    // Extend trial
    const newTrialEnd = new Date();
    newTrialEnd.setDate(newTrialEnd.getDate() + extendTrialDays);

    const { error: subError } = await supabaseAdmin
      .from('subscriptions')
      .update({
        trial_end: newTrialEnd.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (subError) {
      console.error('[admin-reset-user] Error updating subscription:', subError);
    }

    // Delete meal plans
    await supabaseAdmin
      .from('meal_plans')
      .delete()
      .eq('user_id', userId);

    // Delete weekly menus
    await supabaseAdmin
      .from('user_weekly_menus')
      .delete()
      .eq('user_id', userId);

    // Delete meal ratings
    const { data: mealPlans } = await supabaseAdmin
      .from('meal_plans')
      .select('id')
      .eq('user_id', userId);

    if (mealPlans && mealPlans.length > 0) {
      const mealPlanIds = mealPlans.map(mp => mp.id);
      await supabaseAdmin
        .from('meal_ratings')
        .delete()
        .in('meal_plan_id', mealPlanIds);
    }

    console.log(`[admin-reset-user] Successfully reset user: ${email}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `User ${email} has been completely reset`,
        user_id: userId,
        new_trial_end: newTrialEnd.toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[admin-reset-user] Error:', error);
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
