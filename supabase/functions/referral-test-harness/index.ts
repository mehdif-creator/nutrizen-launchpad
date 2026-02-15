import { createClient } from '../_shared/deps.ts';
import { requireAdmin } from '../_shared/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface TestResult {
  step: string;
  success: boolean;
  message_fr: string;
  details?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentification requise.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Token invalide.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify admin
    await requireAdmin(adminClient, user.id);

    const results: TestResult[] = [];
    const testVisitorId = `test_${crypto.randomUUID()}`;
    const testReferralCode = `TEST_${Date.now()}`;
    const testReferredUserId = crypto.randomUUID();

    // Step 1: Create test referral code
    try {
      const { error } = await adminClient
        .from('referral_codes')
        .upsert({ code: testReferralCode, user_id: user.id }, { onConflict: 'code' });

      results.push({
        step: 'create_referral_code',
        success: !error,
        message_fr: error ? `Échec création code: ${error.message}` : 'Code de parrainage créé.',
        details: { code: testReferralCode },
      });
    } catch (err) {
      results.push({
        step: 'create_referral_code',
        success: false,
        message_fr: `Erreur: ${String(err)}`,
      });
    }

    // Step 2: Simulate click
    try {
      const { error } = await adminClient
        .from('referral_clicks')
        .insert({
          referral_code: testReferralCode,
          referrer_user_id: user.id,
          visitor_id: testVisitorId,
          ip_hash: 'test_ip_hash',
          landing_path: '/test',
        });

      results.push({
        step: 'simulate_click',
        success: !error,
        message_fr: error ? `Échec clic: ${error.message}` : 'Clic simulé enregistré.',
        details: { visitor_id: testVisitorId },
      });
    } catch (err) {
      results.push({
        step: 'simulate_click',
        success: false,
        message_fr: `Erreur: ${String(err)}`,
      });
    }

    // Step 3: Record signup event
    try {
      const { data, error } = await adminClient.rpc('rpc_record_referral_event', {
        p_referrer_user_id: user.id,
        p_event_type: 'signup',
        p_referred_user_id: testReferredUserId,
        p_referral_code: testReferralCode,
        p_visitor_id: testVisitorId,
        p_metadata: { test: true, step: 'signup' },
        p_idempotency_key: `test_signup_${testVisitorId}`,
      });

      results.push({
        step: 'record_signup',
        success: !error && data?.success,
        message_fr: error ? `Échec signup: ${error.message}` : 'Événement signup enregistré.',
        details: data,
      });
    } catch (err) {
      results.push({
        step: 'record_signup',
        success: false,
        message_fr: `Erreur: ${String(err)}`,
      });
    }

    // Step 4: Record qualified event
    try {
      const { data, error } = await adminClient.rpc('rpc_record_referral_event', {
        p_referrer_user_id: user.id,
        p_event_type: 'qualified',
        p_referred_user_id: testReferredUserId,
        p_referral_code: testReferralCode,
        p_visitor_id: testVisitorId,
        p_metadata: { test: true, step: 'qualified' },
        p_idempotency_key: `test_qualified_${testVisitorId}`,
      });

      results.push({
        step: 'record_qualified',
        success: !error && data?.success,
        message_fr: error ? `Échec qualified: ${error.message}` : 'Événement qualified enregistré.',
        details: data,
      });
    } catch (err) {
      results.push({
        step: 'record_qualified',
        success: false,
        message_fr: `Erreur: ${String(err)}`,
      });
    }

    // Step 5: Record reward_granted event
    try {
      const { data, error } = await adminClient.rpc('rpc_record_referral_event', {
        p_referrer_user_id: user.id,
        p_event_type: 'reward_granted',
        p_referred_user_id: testReferredUserId,
        p_referral_code: testReferralCode,
        p_visitor_id: testVisitorId,
        p_metadata: { test: true, step: 'reward', credits_granted: 5 },
        p_idempotency_key: `test_reward_${testVisitorId}`,
      });

      results.push({
        step: 'record_reward',
        success: !error && data?.success,
        message_fr: error ? `Échec reward: ${error.message}` : 'Événement reward_granted enregistré.',
        details: data,
      });
    } catch (err) {
      results.push({
        step: 'record_reward',
        success: false,
        message_fr: `Erreur: ${String(err)}`,
      });
    }

    // Step 6: Verify events exist
    try {
      const { data: events, error } = await adminClient
        .from('referral_events')
        .select('event_type, created_at')
        .eq('referrer_user_id', user.id)
        .like('idempotency_key', `test_%${testVisitorId}%`)
        .order('created_at', { ascending: true });

      const eventTypes = events?.map(e => e.event_type) || [];
      const hasAllEvents = ['signup', 'qualified', 'reward_granted'].every(t => eventTypes.includes(t));

      results.push({
        step: 'verify_events',
        success: !error && hasAllEvents,
        message_fr: hasAllEvents 
          ? 'Tous les événements vérifiés (signup → qualified → reward).' 
          : `Événements manquants. Trouvés: ${eventTypes.join(', ')}`,
        details: { events_found: eventTypes },
      });
    } catch (err) {
      results.push({
        step: 'verify_events',
        success: false,
        message_fr: `Erreur vérification: ${String(err)}`,
      });
    }

    // Step 7: Verify self-referral blocked
    try {
      // Attempt to create attribution for self
      const { data: attrData, error: attrError } = await adminClient
        .from('referral_attributions')
        .insert({
          referrer_user_id: user.id,
          referred_user_id: user.id, // Self-referral
        })
        .select()
        .maybeSingle();

      // If insert succeeded, that's a failure (should be blocked)
      if (attrData) {
        // Clean up
        await adminClient
          .from('referral_attributions')
          .delete()
          .eq('id', attrData.id);

        results.push({
          step: 'self_referral_blocked',
          success: false,
          message_fr: 'ÉCHEC: L\'auto-parrainage devrait être bloqué mais a réussi.',
        });
      } else {
        results.push({
          step: 'self_referral_blocked',
          success: true,
          message_fr: 'OK: L\'auto-parrainage est correctement bloqué.',
          details: { error_message: attrError?.message },
        });
      }
    } catch (err) {
      results.push({
        step: 'self_referral_blocked',
        success: true,
        message_fr: 'OK: L\'auto-parrainage a été rejeté.',
        details: { error: String(err) },
      });
    }

    // Step 8: Clean up test data
    try {
      await adminClient
        .from('referral_events')
        .delete()
        .like('idempotency_key', `test_%${testVisitorId}%`);

      await adminClient
        .from('referral_clicks')
        .delete()
        .eq('visitor_id', testVisitorId);

      await adminClient
        .from('referral_codes')
        .delete()
        .eq('code', testReferralCode);

      results.push({
        step: 'cleanup',
        success: true,
        message_fr: 'Données de test nettoyées.',
      });
    } catch (err) {
      results.push({
        step: 'cleanup',
        success: false,
        message_fr: `Erreur nettoyage: ${String(err)}`,
      });
    }

    // Summary
    const passCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return new Response(
      JSON.stringify({
        success: failCount === 0,
        summary: {
          total: results.length,
          pass: passCount,
          fail: failCount,
        },
        results,
        message_fr: failCount === 0 
          ? 'Tous les tests de parrainage ont réussi ✓' 
          : `${failCount} test(s) échoué(s) sur ${results.length}`,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[referral-test-harness] Error:', err);

    if (err instanceof Error && err.message.includes('Admin access required')) {
      return new Response(
        JSON.stringify({ error: 'Accès admin requis.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Erreur serveur interne.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
