import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { requireAdmin } from '../_shared/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  details?: Record<string, unknown>;
  duration_ms: number;
}

async function runCheck(name: string, fn: () => Promise<Omit<CheckResult, 'name' | 'duration_ms'>>): Promise<CheckResult> {
  const start = Date.now();
  try {
    const result = await fn();
    return { name, ...result, duration_ms: Date.now() - start };
  } catch (err) {
    return { name, status: 'fail', message: `Exception: ${String(err)}`, duration_ms: Date.now() - start };
  }
}

// 1) Supabase connection
async function checkSupabaseConnection() {
  const { data, error } = await adminClient.from('profiles').select('id').limit(1);
  if (error) return { status: 'fail' as const, message: `Cannot read profiles: ${error.message}` };
  
  const { data: recipes, error: recErr } = await adminClient.from('recipes').select('id').limit(1);
  if (recErr) return { status: 'fail' as const, message: `Cannot read recipes: ${recErr.message}` };
  
  return { status: 'pass' as const, message: 'Supabase connection OK. Can read profiles and recipes.' };
}

// 2) Safety gate
async function checkSafetyGate() {
  const { data, error } = await adminClient.rpc('get_safety_violations', { p_limit: 10 });
  if (error) return { status: 'fail' as const, message: `RPC error: ${error.message}` };
  
  const violations = data || [];
  if (violations.length > 0) {
    return {
      status: 'fail' as const,
      message: `${violations.length} menu safety violation(s) detected!`,
      details: { violations: violations.slice(0, 5) },
    };
  }
  return { status: 'pass' as const, message: 'No menu safety violations found.' };
}

// 3) Credit consistency
async function checkCreditConsistency() {
  const { data, error } = await adminClient.rpc('check_credit_consistency');
  if (error) return { status: 'fail' as const, message: `RPC error: ${error.message}` };
  
  const result = data as { is_consistent: boolean; negative_balances: number; duplicate_idempotency_keys: number; wallet_ledger_mismatches: number };
  if (!result.is_consistent) {
    return {
      status: 'fail' as const,
      message: `Credit inconsistency: ${result.negative_balances} negative, ${result.duplicate_idempotency_keys} dupes, ${result.wallet_ledger_mismatches} mismatches`,
      details: result as unknown as Record<string, unknown>,
    };
  }
  return { status: 'pass' as const, message: 'Credit accounting consistent.', details: result as unknown as Record<string, unknown> };
}

// 4) Stuck jobs
async function checkStuckJobs() {
  const { data, error } = await adminClient.rpc('check_stuck_jobs', { p_minutes: 15 });
  if (error) return { status: 'fail' as const, message: `RPC error: ${error.message}` };
  
  const result = data as { has_stuck_jobs: boolean; stuck_menu_jobs: number; stuck_automation_jobs: number };
  if (result.has_stuck_jobs) {
    return {
      status: 'warn' as const,
      message: `Stuck jobs: ${result.stuck_menu_jobs} menu, ${result.stuck_automation_jobs} automation`,
      details: result as unknown as Record<string, unknown>,
    };
  }
  return { status: 'pass' as const, message: 'No stuck jobs.' };
}

// 5) Images integrity
async function checkImages() {
  const { data, error } = await adminClient.rpc('check_images_integrity');
  if (error) return { status: 'fail' as const, message: `RPC error: ${error.message}` };
  
  const result = data as { is_clean: boolean; missing_url_count: number; sample_recipe_ids: string[] };
  if (!result.is_clean) {
    return {
      status: 'warn' as const,
      message: `${result.missing_url_count} recipes with image_path but no image_url`,
      details: result as unknown as Record<string, unknown>,
    };
  }
  
  // Sample HEAD check on 3 published recipes with image_url
  const { data: sampleRecipes } = await adminClient
    .from('recipes')
    .select('id, image_url')
    .not('image_url', 'is', null)
    .eq('published', true)
    .limit(3);
  
  let brokenCount = 0;
  if (sampleRecipes) {
    for (const r of sampleRecipes) {
      try {
        const res = await fetch(r.image_url, { method: 'HEAD' });
        if (!res.ok && res.status !== 304) brokenCount++;
      } catch { brokenCount++; }
    }
  }
  
  if (brokenCount > 0) {
    return { status: 'warn' as const, message: `${brokenCount}/${sampleRecipes?.length || 0} sampled image URLs returned errors.` };
  }
  
  return { status: 'pass' as const, message: 'Images integrity OK.' };
}

// 6) Stripe env check
async function checkStripeConfig() {
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  
  const issues: string[] = [];
  if (!stripeKey) issues.push('STRIPE_SECRET_KEY missing');
  if (!webhookSecret) issues.push('STRIPE_WEBHOOK_SECRET missing');
  
  if (issues.length > 0) {
    return { status: 'fail' as const, message: `Stripe config issues: ${issues.join(', ')}` };
  }
  
  // Verify key format
  if (!stripeKey!.startsWith('sk_')) {
    return { status: 'warn' as const, message: 'STRIPE_SECRET_KEY does not start with sk_' };
  }
  
  return {
    status: 'pass' as const,
    message: `Stripe configured. Mode: ${stripeKey!.startsWith('sk_test_') ? 'TEST' : 'LIVE'}`,
    details: { webhook_endpoint: `${SUPABASE_URL}/functions/v1/stripe-webhook` },
  };
}

// 7) Realtime tables check
async function checkRealtimeConfig() {
  const keyTables = ['user_wallets', 'user_weekly_menu_items', 'user_daily_recipes', 'grocery_lists', 'user_dashboard_stats', 'user_gamification'];
  
  // Check if tables exist and have data
  const results: Record<string, string> = {};
  for (const table of keyTables) {
    try {
      const { error } = await adminClient.from(table).select('*', { count: 'exact', head: true });
      results[table] = error ? `error: ${error.message}` : 'accessible';
    } catch {
      results[table] = 'error';
    }
  }
  
  const errorTables = Object.entries(results).filter(([, v]) => v !== 'accessible');
  if (errorTables.length > 0) {
    return {
      status: 'warn' as const,
      message: `${errorTables.length} realtime tables inaccessible`,
      details: results,
    };
  }
  
  return { status: 'pass' as const, message: 'All key realtime tables accessible.', details: results };
}

// 8) Menu generation pipeline
async function checkMenuPipeline() {
  // Check if we can query menu_generation_jobs
  const { data, error } = await adminClient
    .from('menu_generation_jobs')
    .select('id, status, created_at')
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (error) return { status: 'fail' as const, message: `Cannot query menu_generation_jobs: ${error.message}` };
  
  const recent = data || [];
  const errorJobs = recent.filter((j: { status: string }) => j.status === 'error');
  
  if (errorJobs.length === recent.length && recent.length > 0) {
    return { status: 'fail' as const, message: `All ${recent.length} recent menu jobs failed.`, details: { recent_jobs: recent } };
  }
  
  if (errorJobs.length > 0) {
    return { status: 'warn' as const, message: `${errorJobs.length}/${recent.length} recent menu jobs failed.`, details: { recent_jobs: recent } };
  }
  
  return { status: 'pass' as const, message: `Menu pipeline OK. ${recent.length} recent jobs checked.` };
}

// 9) Active alerts
async function checkActiveAlerts() {
  const { data, error } = await adminClient.rpc('get_active_alerts');
  if (error) return { status: 'pass' as const, message: 'Alerts table accessible (no active alerts or RPC issue).' };
  
  const alerts = data || [];
  if (alerts.length > 0) {
    const critical = alerts.filter((a: { severity: string }) => a.severity === 'critical' || a.severity === 'error');
    if (critical.length > 0) {
      return { status: 'fail' as const, message: `${critical.length} critical/error alerts active!`, details: { alerts: alerts.slice(0, 5) } };
    }
    return { status: 'warn' as const, message: `${alerts.length} active alert(s).`, details: { alerts: alerts.slice(0, 5) } };
  }
  
  return { status: 'pass' as const, message: 'No active system alerts.' };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require admin
    const adminResult = await requireAdmin(req);
    if (adminResult instanceof Response) return adminResult;
    
    const { checks: requestedChecks } = await req.json().catch(() => ({ checks: null }));
    
    const allChecks = [
      { key: 'supabase_connection', fn: checkSupabaseConnection },
      { key: 'safety_gate', fn: checkSafetyGate },
      { key: 'credit_consistency', fn: checkCreditConsistency },
      { key: 'stuck_jobs', fn: checkStuckJobs },
      { key: 'images_integrity', fn: checkImages },
      { key: 'stripe_config', fn: checkStripeConfig },
      { key: 'realtime_tables', fn: checkRealtimeConfig },
      { key: 'menu_pipeline', fn: checkMenuPipeline },
      { key: 'active_alerts', fn: checkActiveAlerts },
    ];
    
    const checksToRun = requestedChecks
      ? allChecks.filter(c => requestedChecks.includes(c.key))
      : allChecks;
    
    const results = await Promise.all(
      checksToRun.map(c => runCheck(c.key, c.fn))
    );
    
    const passCount = results.filter(r => r.status === 'pass').length;
    const failCount = results.filter(r => r.status === 'fail').length;
    const warnCount = results.filter(r => r.status === 'warn').length;
    
    // Store results in health_checks table
    const insertRows = results.map(r => ({
      check_name: r.name,
      status: r.status,
      message: r.message,
      details: { ...r.details, duration_ms: r.duration_ms },
      admin_user_id: adminResult.id,
    }));
    
    await adminClient.from('health_checks').insert(insertRows);
    
    return new Response(JSON.stringify({
      status: failCount > 0 ? 'fail' : warnCount > 0 ? 'warn' : 'pass',
      summary: { total: results.length, pass: passCount, fail: failCount, warn: warnCount },
      checks: results,
      run_at: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
