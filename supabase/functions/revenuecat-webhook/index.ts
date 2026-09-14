/**
 * RevenueCat server webhook → Supabase.
 *
 * Configure in RevenueCat → Integrations → Webhooks:
 *   URL:            https://<project>.supabase.co/functions/v1/revenuecat-webhook
 *   Authorization:  the exact value stored in the REVENUECAT_WEBHOOK_SECRET secret
 *
 * Every event triggers a full authoritative re-read of the subscriber from the
 * RevenueCat REST API, so renewals, cancellations, billing issues, expirations
 * and refunds all converge to the same state.
 */
import { createClient } from '../_shared/deps.ts';
import { syncAppUser } from '../_shared/revenuecat.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const expected = Deno.env.get('REVENUECAT_WEBHOOK_SECRET');
  const provided = req.headers.get('Authorization') ?? '';
  if (!expected || provided !== expected) {
    console.warn('[revenuecat-webhook] rejected: bad authorization header');
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const payload = (await req.json()) as {
      event?: { type?: string; app_user_id?: string; original_app_user_id?: string };
    };
    const appUserId = payload.event?.app_user_id ?? payload.event?.original_app_user_id;
    if (!appUserId) return new Response('Missing app_user_id', { status: 400 });

    // Non-UUID app user ids (anonymous RevenueCat ids) have no Supabase account yet.
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      appUserId
    );
    if (!isUuid) {
      console.log('[revenuecat-webhook] ignored anonymous app_user_id');
      return new Response(JSON.stringify({ ignored: true }), { status: 200 });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const state = await syncAppUser(admin, appUserId);
    console.log('[revenuecat-webhook] processed', {
      type: payload.event?.type,
      entitlement: state.entitlement,
      status: state.status,
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[revenuecat-webhook] error', error);
    return new Response('Webhook error', { status: 500 });
  }
});
